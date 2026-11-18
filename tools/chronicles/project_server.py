"""Local Chronicles project storage and presentation server with media byte ranges.

The HTTP API edits one configured Markdown file. It never accepts filesystem
paths from a request and never exposes the Co-Writer bridge to the browser.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import time
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PROJECT = ROOT / 'repo/src/chronicles/default-project.md'
HUB_SCRIPT = Path('F:/AI/AI_Control_Hub_Portable/AgentTools/hub.py')
MAX_BODY_BYTES = 2 * 1024 * 1024
API_PATH = '/api/chronicles/project'
CONFIG_RE = re.compile(r'^```chronicles-config[^\S\r\n]*\r?\n([\s\S]*?)^```[^\S\r\n]*$', re.MULTILINE)

_presentation_spec = importlib.util.spec_from_file_location(
    'chronicles_presentation_server', ROOT / 'tools/interactive/serve_presentation.py')
assert _presentation_spec is not None and _presentation_spec.loader is not None
_presentation = importlib.util.module_from_spec(_presentation_spec)
_presentation_spec.loader.exec_module(_presentation)


class ProjectError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def text_version(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def parse_json(text: str) -> Any:
    def invalid_constant(value: str):
        raise ValueError(f'Non-finite JSON value: {value}')
    return json.loads(text, parse_constant=invalid_constant)


def validate_markdown(markdown: str) -> dict:
    if not isinstance(markdown, str) or not markdown.strip():
        raise ProjectError(400, 'invalid_project', 'Проект должен содержать текст Markdown.')
    markdown = markdown.replace('\r\n', '\n')
    if len(markdown.encode('utf-8')) > MAX_BODY_BYTES:
        raise ProjectError(413, 'project_too_large', 'Размер проекта превышает 2 МиБ.')
    sections = list(CONFIG_RE.finditer(markdown))
    if len(sections) != 1:
        raise ProjectError(400, 'invalid_config', 'Нужна ровно одна секция ```chronicles-config.')
    try:
        config = parse_json(sections[0].group(1))
    except (ValueError, TypeError):
        raise ProjectError(400, 'invalid_config', 'Секция chronicles-config содержит некорректный JSON.') from None
    if not isinstance(config, dict) or config.get('schemaVersion') != 1:
        raise ProjectError(400, 'unsupported_schema', 'Поддерживается schemaVersion: 1.')
    if not isinstance(config.get('id'), str) or not config['id'].strip():
        raise ProjectError(400, 'invalid_config', 'У проекта отсутствует постоянный id.')
    for field in ('tracks', 'assets', 'utterances', 'scenes', 'clips', 'stops', 'sequence'):
        if not isinstance(config.get(field), list):
            raise ProjectError(400, 'invalid_config', f'Поле {field} должно быть массивом.')
    for field in ('tracks', 'assets', 'utterances', 'scenes', 'clips', 'stops'):
        values = config[field]
        ids = [item.get('id') for item in values if isinstance(item, dict)]
        if len(ids) != len(values) or any(not isinstance(i, str) or not i for i in ids) or len(set(ids)) != len(ids):
            raise ProjectError(400, 'invalid_config', f'В {field} нужны уникальные непустые id.')
    return config


def resolved_project_path(root: Path, project_path: Path) -> Path:
    root = root.resolve()
    target = (project_path if project_path.is_absolute() else root / project_path).resolve()
    if not target.is_relative_to(root) or any(part.casefold() == 'fin' for part in target.relative_to(root).parts):
        raise ProjectError(400, 'invalid_project_path', 'Файл проекта должен быть внутри проекта и вне папок Fin.')
    if target.suffix.casefold() not in ('.md', '.txt'):
        raise ProjectError(400, 'invalid_project_path', 'Проект сохраняется только в .md или .txt.')
    return target


class HubClient:
    """Thin JSON-only subprocess client; params live in a private temporary file."""
    def __init__(self, history_dir: Path, script: Path = HUB_SCRIPT):
        self.history_dir, self.script = history_dir, script

    def call(self, method: str, params: dict | None = None) -> dict:
        if not self.script.is_file():
            raise ProjectError(503, 'hub_not_running', 'Co-Writer bridge не установлен.')
        self.history_dir.mkdir(parents=True, exist_ok=True)
        params_file = None
        args = [sys.executable, str(self.script)]
        try:
            if params is not None:
                with tempfile.NamedTemporaryFile('w', encoding='utf-8', prefix='hub-', suffix='.json',
                                                 dir=self.history_dir, delete=False) as stream:
                    json.dump(params, stream, ensure_ascii=False)
                    params_file = Path(stream.name)
                args += ['--params-file', str(params_file)]
            args.append(method)
            result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8',
                                    errors='replace', timeout=25, shell=False)
            try:
                data = json.loads(result.stdout)
            except ValueError:
                raise ProjectError(503, 'hub_unavailable', 'Co-Writer bridge не вернул корректный ответ.') from None
            if not data.get('ok'):
                code = str(data.get('error', {}).get('code', 'hub_unavailable'))
                status = 409 if code in ('version_conflict', 'disk_conflict', 'unsaved_changes') else 503
                # Do not forward diagnostics/logs or subprocess stderr to the page.
                messages = {
                    'access_denied': 'Нет доступа к Co-Writer. Запустите локальный сервер с доступом к IPC текущего пользователя.',
                    'hub_not_running': 'Co-Writer сейчас не запущен.',
                    'version_conflict': 'Документ изменён в Co-Writer. Откройте актуальную версию перед сохранением.',
                    'disk_conflict': 'Файл изменён другим редактором. Нужна актуальная версия.',
                    'unsaved_changes': 'В Co-Writer есть несохранённые изменения.',
                }
                raise ProjectError(status, code, messages.get(code, 'Co-Writer не подтвердил операцию. Черновик сохранён в редакторе.'))
            result_data = data.get('result')
            if not isinstance(result_data, dict):
                raise ProjectError(503, 'hub_unavailable', 'Co-Writer bridge вернул неполный ответ.')
            return result_data
        except subprocess.TimeoutExpired:
            raise ProjectError(503, 'hub_timeout', 'Co-Writer не ответил. Проверьте состояние перед повтором сохранения.') from None
        except OSError:
            raise ProjectError(503, 'hub_unavailable', 'Не удалось обратиться к Co-Writer.') from None
        finally:
            if params_file is not None:
                params_file.unlink(missing_ok=True)

    def status(self) -> dict | None:
        try:
            return self.call('cowriter.status')
        except ProjectError as error:
            if error.code == 'hub_not_running':
                return None
            raise

    def read_document(self, expected_document: dict) -> tuple[str, str]:
        version = expected_document.get('version')
        line_count = expected_document.get('lines')
        if not version or not isinstance(line_count, int) or line_count < 1:
            raise ProjectError(503, 'hub_incomplete', 'В Co-Writer отсутствует версия документа.')
        lines: list[str] = []
        for start in range(1, line_count + 1, 500):
            part = self.call('cowriter.read', {'startLine': start, 'lineCount': 500})
            if part.get('document', {}).get('version') != version:
                raise ProjectError(409, 'version_conflict', 'Документ изменился во время чтения.')
            end = min(start + 499, line_count)
            page_lines = str(part.get('text', '')).replace('\r\n', '\n').split('\n')
            expected_lines = end - start + 1
            if len(page_lines) == expected_lines + 1 and not page_lines[-1]:
                page_lines.pop()  # Some bridge versions include a page terminator.
            if len(page_lines) != expected_lines:
                raise ProjectError(503, 'hub_incomplete', 'Не удалось точно прочитать строки Co-Writer.')
            lines.extend(page_lines)
        final = self.call('cowriter.status').get('document', {})
        if final.get('version') != version or final.get('path') != expected_document.get('path'):
            raise ProjectError(409, 'version_conflict', 'Документ изменился во время чтения.')
        return '\n'.join(lines), str(version)


class ProjectStore:
    def __init__(self, root: Path = ROOT, project_path: Path = DEFAULT_PROJECT,
                 hub: Any = None, history_dir: Path | None = None):
        self.root = root.resolve()
        self.path = resolved_project_path(self.root, project_path)
        self.history_dir = (history_dir or self.root / 'scratch/chronicles-history').resolve()
        if not self.history_dir.is_relative_to(self.root) or 'fin' in (p.casefold() for p in self.history_dir.parts):
            raise ProjectError(400, 'invalid_history_path', 'История проекта должна храниться в рабочем пространстве вне Fin.')
        self.hub = hub if hub is not None else HubClient(self.history_dir)
        self.lock = threading.RLock()

    def _same_project(self, document: dict) -> bool:
        opened = document.get('path')
        return isinstance(opened, str) and Path(opened).resolve() == self.path

    def _snapshot(self) -> tuple[str, str | None]:
        status = self.hub.status()
        document = status.get('document', {}) if status else {}
        if status and status.get('open') and self._same_project(document):
            text, version = self.hub.read_document(document)
            return text, version
        try:
            return self.path.read_text(encoding='utf-8-sig'), None
        except FileNotFoundError:
            raise ProjectError(404, 'project_not_found', 'Текстовый проект ещё не создан.') from None
        except (OSError, UnicodeError):
            raise ProjectError(503, 'project_unreadable', 'Не удалось прочитать текстовый проект.') from None

    def read(self) -> dict:
        with self.lock:
            text, hub_version = self._snapshot()
            return {'markdown': text, 'version': text_version(text), 'path': self.path.relative_to(self.root).as_posix(),
                    'storage': 'cowriter' if hub_version else 'file'}

    def _history(self, previous: str) -> None:
        self.history_dir.mkdir(parents=True, exist_ok=True)
        name = time.strftime('%Y%m%d-%H%M%S') + '-' + str(time.time_ns())[-9:] + '-' + text_version(previous)[:12] + '.md'
        (self.history_dir / name).write_text(previous, encoding='utf-8', newline='')

    def _atomic_write(self, text: str) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        # Resolve again immediately before writing: do not follow a newly replaced parent outside ROOT.
        if resolved_project_path(self.root, self.path) != self.path:
            raise ProjectError(409, 'path_changed', 'Путь проекта изменился. Сохранение отменено.')
        temporary = None
        try:
            with tempfile.NamedTemporaryFile('w', encoding='utf-8', newline='', prefix='.' + self.path.name + '-',
                                             suffix='.tmp', dir=self.path.parent, delete=False) as stream:
                temporary = Path(stream.name)
                stream.write(text)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, self.path)
            temporary = None
        except OSError:
            raise ProjectError(503, 'write_failed', 'Не удалось записать проект. Сохраните экспорт файла.') from None
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)

    def save(self, markdown: str, expected_version: str) -> dict:
        validate_markdown(markdown)
        markdown = markdown.replace('\r\n', '\n')
        if not isinstance(expected_version, str) or not re.fullmatch(r'[a-f0-9]{64}', expected_version):
            raise ProjectError(428, 'version_required', 'Перед сохранением нужна версия открытого проекта.')
        with self.lock:
            previous, hub_version = self._snapshot()
            if text_version(previous) != expected_version:
                raise ProjectError(409, 'version_conflict', 'Проект изменён другим редактором. Откройте новую версию или экспортируйте свой черновик.')
            if markdown == previous:
                return {'version': expected_version, 'path': self.path.relative_to(self.root).as_posix(),
                        'storage': 'cowriter' if hub_version else 'file'}
            self._history(previous)
            if hub_version:
                applied = self.hub.call('cowriter.apply', {'expectedVersion': hub_version,
                    'edits': [{'oldText': previous, 'newText': markdown}]})
                if applied.get('editorVerified') is not True:
                    raise ProjectError(503, 'editor_not_verified', 'Co-Writer не подтвердил применение. Проверьте редактор перед повтором.')
                new_version = applied.get('document', {}).get('version') or applied.get('version')
                if not new_version:
                    raise ProjectError(503, 'hub_incomplete', 'После правки не получена версия Co-Writer.')
                self.hub.call('cowriter.save', {'expectedVersion': new_version})
                saved = self.hub.call('cowriter.status')
                if (not self._same_project(saved.get('document', {})) or saved.get('document', {}).get('dirty')
                        or saved.get('document', {}).get('diskState') != 'unchanged'):
                    raise ProjectError(503, 'save_not_verified', 'Co-Writer не подтвердил сохранение в файл.')
                actual, _ = self.hub.read_document(saved['document'])
                if actual != markdown:
                    raise ProjectError(409, 'post_save_conflict', 'После сохранения документ снова изменился. Откройте актуальную версию.')
            else:
                # Verify disk again after making the history copy.
                if text_version(self.path.read_text(encoding='utf-8-sig')) != expected_version:
                    raise ProjectError(409, 'version_conflict', 'Файл изменился перед записью. Сохранение отменено.')
                self._atomic_write(markdown)
                if self.path.read_text(encoding='utf-8-sig') != markdown.replace('\r\n', '\n'):
                    raise ProjectError(503, 'save_not_verified', 'Не удалось проверить записанный проект.')
            return {'version': text_version(markdown), 'path': self.path.relative_to(self.root).as_posix(),
                    'storage': 'cowriter' if hub_version else 'file'}


class ProjectHandler(_presentation.PresentationHandler):
    server_version = 'ChroniclesProject/1.0'
    protocol_version = 'HTTP/1.1'

    @property
    def store(self) -> ProjectStore:
        return self.server.store

    def _allowed_host(self) -> bool:
        expected = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
        return self.headers.get('Host', '').casefold() in expected

    def _origin_allowed(self, required: bool = False) -> bool:
        origin = self.headers.get('Origin')
        if origin is None:
            return not required and self.headers.get('Sec-Fetch-Site') not in ('cross-site', 'same-site')
        return origin == 'http://' + self.headers.get('Host', '')

    def _json(self, status: int, data: dict, head: bool = False) -> None:
        body = json.dumps(data, ensure_ascii=False, allow_nan=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def _error(self, error: ProjectError, head: bool = False) -> None:
        self._json(error.status, {'error': {'code': error.code, 'message': error.message}}, head)

    def _check_request(self, write: bool = False) -> None:
        if not self._allowed_host():
            raise ProjectError(403, 'host_forbidden', 'Разрешён только локальный адрес сервера.')
        if not self._origin_allowed(required=write):
            raise ProjectError(403, 'origin_forbidden', 'Запрос должен исходить из этой локальной страницы.')

    def _get(self, head: bool = False):
        try:
            self._check_request()
            parsed = urlsplit(self.path)
            if parsed.path == API_PATH:
                if parsed.query:
                    raise ProjectError(400, 'invalid_path', 'API не принимает параметры пути.')
                self._json(200, self.store.read(), head)
                return
            parts = Path(unquote(parsed.path)).parts
            if '..' in parts or any(part.casefold() in ('.git', '.env', '.history', '.codex', '.aws', 'node_modules') for part in parts):
                raise ProjectError(403, 'path_forbidden', 'Этот путь не предоставляется локальным сервером.')
            target = Path(self.translate_path(parsed.path)).resolve()
            if not target.is_relative_to(self.store.root):
                raise ProjectError(403, 'path_forbidden', 'Путь находится вне проекта.')
            if head:
                super().do_HEAD()
            else:
                super().do_GET()
        except ProjectError as error:
            self._error(error, head)

    def do_GET(self):
        self._get()

    def do_HEAD(self):
        self._get(head=True)

    def do_POST(self):
        try:
            self._check_request(write=True)
            if self.path != API_PATH:
                raise ProjectError(404, 'invalid_path', 'Неизвестная операция проекта.')
            if self.headers.get('Transfer-Encoding'):
                raise ProjectError(400, 'invalid_body', 'Нужен JSON с известной длиной.')
            if self.headers.get_content_type() != 'application/json':
                raise ProjectError(415, 'content_type', 'Нужен Content-Type: application/json.')
            try:
                length = int(self.headers.get('Content-Length', '-1'))
            except ValueError:
                length = -1
            if length < 0:
                raise ProjectError(411, 'length_required', 'Не задана длина запроса.')
            if length > MAX_BODY_BYTES:
                raise ProjectError(413, 'project_too_large', 'Размер запроса превышает 2 МиБ.')
            try:
                payload = parse_json(self.rfile.read(length).decode('utf-8'))
            except (ValueError, UnicodeError):
                raise ProjectError(400, 'invalid_json', 'Некорректный JSON запроса.') from None
            if not isinstance(payload, dict) or set(payload) - {'markdown', 'expectedVersion'}:
                raise ProjectError(400, 'invalid_params', 'Разрешены только markdown и expectedVersion.')
            self._json(200, self.store.save(payload.get('markdown'), payload.get('expectedVersion')))
        except ProjectError as error:
            # Do not interpret unread bytes as another request on this connection.
            self.close_connection = True
            self._error(error)

    def list_directory(self, path):
        self.send_error(403, 'Directory listing is disabled')
        return None


def make_server(root: Path = ROOT, project_path: Path = DEFAULT_PROJECT, port: int = 8876,
                store: ProjectStore | None = None) -> ThreadingHTTPServer:
    store = store or ProjectStore(root, project_path)
    server = ThreadingHTTPServer(('127.0.0.1', port), partial(ProjectHandler, directory=str(store.root)))
    server.store = store
    server.daemon_threads = True
    return server


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8876)
    parser.add_argument('--directory', type=Path, default=ROOT)
    parser.add_argument('--project', type=Path, default=DEFAULT_PROJECT)
    parser.add_argument('--open', action='store_true', help='Open the director after the listening socket is ready')
    args = parser.parse_args()
    try:
        server = make_server(args.directory, args.project, args.port)
    except ProjectError as error:
        parser.error(error.message)
    except OSError as error:
        parser.exit(1, f'Не удалось открыть локальный порт {args.port}: {error}\n')
    print(f'Chronicles + director: http://127.0.0.1:{server.server_port}/index.html#playable-area', flush=True)
    print(f'Text project: {server.store.path}', flush=True)
    if args.open:
        import webbrowser
        webbrowser.open(f'http://127.0.0.1:{server.server_port}/repo/dist/index.html?director')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
