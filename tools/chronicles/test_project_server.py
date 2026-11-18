"""Integration tests: file-backed round trips, conflicts, IPC handoff and HTTP boundaries."""
from __future__ import annotations

import copy
import http.client
import importlib.util
import json
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('chronicles_project_server', Path(__file__).with_name('project_server.py'))
module = importlib.util.module_from_spec(spec)
assert spec is not None and spec.loader is not None
spec.loader.exec_module(module)


def markdown(title='Первый монтаж'):
    config = {'schemaVersion': 1, 'id': 'test-project', 'title': title,
              **{key: [] for key in ('tracks', 'assets', 'utterances', 'scenes', 'clips', 'stops', 'sequence')}}
    return '# Хроники\n\n[ГОЛОС ЛОРДА TEST]\nНеизменяемая цитата.\n[КОНЕЦ РЕПЛИКИ]\n\n```chronicles-config\n' + json.dumps(config, ensure_ascii=False, indent=2) + '\n```\n'


class NoHub:
    def status(self):
        return None


class FakeHub:
    def __init__(self, path: Path, text: str):
        self.path, self.text, self.version, self.dirty = path, text, 'opaque-live-1', False
        self.calls = []

    def document(self):
        return {'path': str(self.path), 'version': self.version, 'dirty': self.dirty,
                'lines': len(self.text.split('\n')), 'diskState': 'unchanged'}

    def status(self):
        return {'open': True, 'document': self.document()}

    def read_document(self, document):
        assert document['version'] == self.version
        return self.text, self.version

    def call(self, method, params=None):
        self.calls.append((method, params))
        if method == 'cowriter.apply':
            assert params['expectedVersion'] == self.version
            assert params['edits'][0]['oldText'] == self.text
            self.text = params['edits'][0]['newText']
            self.version = 'opaque-live-2'
            self.dirty = True
            return {'editorVerified': True, 'document': self.document()}
        if method == 'cowriter.save':
            assert params['expectedVersion'] == self.version
            self.path.write_text(self.text, encoding='utf-8')
            self.dirty = False
            return {'document': self.document()}
        if method == 'cowriter.status':
            return self.status()
        raise AssertionError(method)


class ProjectServerTest(unittest.TestCase):
    def setUp(self):
        (ROOT / 'scratch').mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=ROOT / 'scratch', prefix='chronicles-storage-test-')
        self.root = Path(self.temp.name).resolve()
        self.project = self.root / 'project.md'
        self.project.write_text(markdown(), encoding='utf-8', newline='')
        self.store = module.ProjectStore(self.root, self.project, hub=NoHub())
        self.quiet = patch.object(module.ProjectHandler, 'log_message', lambda *args: None)
        self.quiet.start()
        self.audio = bytes(range(256)) * 100
        (self.root / 'clip.mp3').write_bytes(self.audio)
        self.server = module.make_server(self.root, self.project, 0, store=self.store)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.origin = f'http://127.0.0.1:{self.server.server_port}'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)
        self.quiet.stop()
        assert self.root.is_relative_to((ROOT / 'scratch').resolve())
        self.temp.cleanup()

    def request(self, method='GET', path=module.API_PATH, body=None, headers=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        request_headers = dict(headers or {})
        if isinstance(body, dict):
            body = json.dumps(body, ensure_ascii=False).encode('utf-8')
            request_headers.setdefault('Content-Type', 'application/json')
        if method == 'POST':
            request_headers.setdefault('Origin', self.origin)
        connection.request(method, path, body=body, headers=request_headers)
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return result

    def data(self):
        status, _, body = self.request()
        self.assertEqual(status, 200)
        return json.loads(body)

    def test_round_trip_saved_to_file_and_history(self):
        initial = self.data()
        edited = markdown('Новый монтаж: звук и скриншот')
        status, _, body = self.request('POST', body={'markdown': edited, 'expectedVersion': initial['version']})
        self.assertEqual(status, 200, body)
        result = json.loads(body)
        self.assertEqual(result['version'], module.text_version(edited))
        self.assertEqual(self.project.read_text(encoding='utf-8'), edited)
        history = list((self.root / 'scratch/chronicles-history').glob('*.md'))
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0].read_text(encoding='utf-8'), initial['markdown'])
        self.assertEqual(self.data()['markdown'], edited)

    def test_conflict_never_overwrites_external_edit(self):
        initial = self.data()
        external = markdown('Ручная правка автора')
        self.project.write_text(external, encoding='utf-8')
        status, _, body = self.request('POST', body={'markdown': markdown('Устаревший монтаж'), 'expectedVersion': initial['version']})
        self.assertEqual(status, 409, body)
        self.assertEqual(json.loads(body)['error']['code'], 'version_conflict')
        self.assertEqual(self.project.read_text(encoding='utf-8'), external)

    def test_parallel_saves_have_one_winner(self):
        initial = self.data()
        def save(i):
            return self.request('POST', body={'markdown': markdown(f'Попытка {i}'), 'expectedVersion': initial['version']})[0]
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(save, range(4)))
        self.assertEqual(results.count(200), 1)
        self.assertEqual(results.count(409), 3)

    def test_media_ranges_still_work(self):
        status, headers, body = self.request(path='/clip.mp3', headers={'Range': 'bytes=10-29'})
        self.assertEqual(status, 206)
        self.assertEqual(headers['Content-Range'], f'bytes 10-29/{len(self.audio)}')
        self.assertEqual(body, self.audio[10:30])
        status, headers, body = self.request('HEAD', '/clip.mp3', headers={'Range': 'bytes=-16'})
        self.assertEqual((status, headers['Content-Length'], body), (206, '16', b''))

    def test_cross_origin_and_host_rebinding_are_rejected(self):
        payload = {'markdown': markdown('X'), 'expectedVersion': self.data()['version']}
        for method in ('GET', 'POST'):
            status, headers, _ = self.request(method, body=payload if method == 'POST' else None,
                                             headers={'Origin': 'https://example.invalid'})
            self.assertEqual(status, 403)
            self.assertNotIn('Access-Control-Allow-Origin', headers)
        status, _, _ = self.request(headers={'Host': 'untrusted.invalid'})
        self.assertEqual(status, 403)
        status, _, _ = self.request(headers={'Sec-Fetch-Site': 'cross-site'})
        self.assertEqual(status, 403)

    def test_missing_origin_cannot_write(self):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        body = json.dumps({'markdown': markdown(), 'expectedVersion': self.data()['version']})
        connection.request('POST', module.API_PATH, body=body, headers={'Content-Type': 'application/json'})
        response = connection.getresponse()
        self.assertEqual(response.status, 403)
        response.read()
        connection.close()

    def test_unknown_path_or_payload_path_cannot_write(self):
        payload = {'markdown': markdown('X'), 'expectedVersion': self.data()['version']}
        status, _, _ = self.request('POST', '/api/chronicles/other', payload)
        self.assertEqual(status, 404)
        status, _, _ = self.request('POST', body={**payload, 'path': '../elsewhere.md'})
        self.assertEqual(status, 400)
        for path in ('/.git/config', '/../outside.md', '/api/chronicles/project?path=outside.md'):
            with self.subTest(path=path):
                status, _, _ = self.request(path=path)
                self.assertIn(status, (400, 403))

    def test_invalid_json_schema_and_size_are_rejected(self):
        version = self.data()['version']
        status, _, _ = self.request('POST', body=b'{', headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 400)
        for content in ('# Missing config', markdown().replace('"schemaVersion": 1', '"schemaVersion": 99'),
                        markdown().replace('"id": "test-project"', '"id": NaN')):
            status, _, _ = self.request('POST', body={'markdown': content, 'expectedVersion': version})
            self.assertEqual(status, 400)
        status, _, _ = self.request('POST', body={'markdown': markdown()})
        self.assertEqual(status, 428)
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        connection.putrequest('POST', module.API_PATH)
        for name, value in {'Origin': self.origin, 'Content-Type': 'application/json',
                            'Content-Length': str(module.MAX_BODY_BYTES + 1)}.items():
            connection.putheader(name, value)
        connection.endheaders()
        response = connection.getresponse()
        self.assertEqual(response.status, 413)
        response.read()
        connection.close()

    def test_project_path_stays_inside_workspace_and_outside_fin(self):
        for path in (self.root.parent / 'elsewhere.md', self.root / 'Fin/project.md', self.root / 'fin' / 'project.txt'):
            with self.subTest(path=path), self.assertRaises(module.ProjectError):
                module.ProjectStore(self.root, path, hub=NoHub())

    def test_cowriter_open_project_uses_verified_api_and_live_version(self):
        live = markdown('Несохранённый живой документ')
        hub = FakeHub(self.project, live)
        hub.dirty = True
        self.store.hub = hub
        initial = self.data()
        self.assertEqual(initial['markdown'], live)
        edited = markdown('Правка из режиссёра')
        with patch.object(self.store, '_atomic_write', side_effect=AssertionError('must use API')):
            status, _, body = self.request('POST', body={'markdown': edited, 'expectedVersion': initial['version']})
        self.assertEqual(status, 200, body)
        self.assertEqual([call[0] for call in hub.calls], ['cowriter.apply', 'cowriter.save', 'cowriter.status'])
        self.assertEqual(self.project.read_text(encoding='utf-8'), edited)

    def test_cowriter_access_denied_never_falls_back_to_disk_write(self):
        class DeniedHub:
            def status(self):
                raise module.ProjectError(503, 'access_denied', 'IPC unavailable')
        self.store.hub = DeniedHub()
        before = self.project.read_bytes()
        status, _, body = self.request('POST', body={'markdown': markdown('X'), 'expectedVersion': module.text_version(markdown())})
        self.assertEqual(status, 503, body)
        self.assertEqual(self.project.read_bytes(), before)

    def test_unverified_hub_apply_never_calls_save_or_direct_write(self):
        class UnverifiedHub(FakeHub):
            def call(self, method, params=None):
                result = super().call(method, params)
                if method == 'cowriter.apply':
                    result['editorVerified'] = False
                return result
        hub = UnverifiedHub(self.project, markdown())
        self.store.hub = hub
        before = self.project.read_bytes()
        status, _, body = self.request('POST', body={'markdown': markdown('Новое'), 'expectedVersion': self.data()['version']})
        self.assertEqual(status, 503, body)
        self.assertEqual(self.project.read_bytes(), before)
        self.assertEqual([method for method, _ in hub.calls], ['cowriter.apply'])

    def test_another_open_document_is_not_switched_or_modified(self):
        hub = FakeHub(self.root / 'another.md', '# Чужой черновик')
        self.store.hub = hub
        initial = self.data()
        status, _, body = self.request('POST', body={'markdown': markdown('Новая версия'), 'expectedVersion': initial['version']})
        self.assertEqual(status, 200, body)
        self.assertEqual(hub.text, '# Чужой черновик')
        self.assertEqual(hub.calls, [])

    def test_crlf_save_uses_stable_lf_version(self):
        edited = markdown('CRLF').replace('\n', '\r\n')
        status, _, body = self.request('POST', body={'markdown': edited, 'expectedVersion': self.data()['version']})
        self.assertEqual(status, 200, body)
        self.assertEqual(json.loads(body)['version'], self.data()['version'])

    def test_hub_paged_read_preserves_blank_lines_and_final_newline(self):
        text = '\n'.join('' if i in (499, 500, 999, 1000, 1004) else f'Строка {i}' for i in range(1005))
        document = {'path': str(self.project), 'version': 'opaque-v', 'lines': len(text.split('\n'))}
        for page_terminator in ('', '\n'):
            hub = module.HubClient(self.root / 'history')
            def call(method, params=None):
                if method == 'cowriter.status':
                    return {'document': document}
                start = params['startLine'] - 1
                return {'document': document, 'text': '\n'.join(text.split('\n')[start:start + params['lineCount']]) + page_terminator}
            hub.call = call
            actual, version = hub.read_document(document)
            self.assertEqual(actual, text)
            self.assertEqual(version, 'opaque-v')


if __name__ == '__main__':
    unittest.main()
