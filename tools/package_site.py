"""Package the public presentation and its exact existing media, without re-encoding.

The archive/editor/source library stays local. Both public film versions keep all
their emitted URLs, including URLs stored in bundled asset dictionaries.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
ENTRIES = ('index.html', 'game.html', 'game-previous.html')

def build_package(output: Path) -> dict:
    output = output.resolve()
    if output != ROOT / '_site':
        raise ValueError('The release output must be the project-local _site directory')
    candidates = [path for directory in ('assets', 'web_assets') for path in (ROOT / directory).rglob('*') if path.is_file()]
    for path in candidates:
        if not path.resolve().is_relative_to(ROOT):
            raise ValueError('Asset resolves outside the project')
    selected = {ROOT / name for name in ENTRIES}
    selected.add(ROOT / '.nojekyll')
    queue = [ROOT / name for name in ENTRIES]
    inspected = set()
    while queue:
        source = queue.pop()
        if source in inspected:
            continue
        inspected.add(source)
        text = source.read_text(encoding='utf-8-sig')
        for candidate in candidates:
            relative = candidate.relative_to(ROOT).as_posix()
            # Vite sometimes emits new URL('hashed-name', document.baseURI).
            referenced = relative in text or candidate.parent == ROOT / 'assets' and candidate.name in text
            if referenced and candidate not in selected:
                selected.add(candidate)
                if candidate.suffix.lower() in ('.css', '.js', '.html', '.svg'):
                    queue.append(candidate)
    if output.exists():
        # Remove only this verified, dedicated package folder; never source media.
        shutil.rmtree(output)
    output.mkdir()
    files = []
    for source in sorted(selected):
        if not source.is_file():
            raise FileNotFoundError(source)
        relative = source.relative_to(ROOT)
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if hashlib.sha256(target.read_bytes()).hexdigest() != digest:
            raise RuntimeError('Package changed bytes: ' + str(relative))
        files.append({'path': relative.as_posix(), 'bytes': source.stat().st_size, 'sha256': digest})
    report = {'entries': ENTRIES, 'files': files, 'fileCount': len(files), 'bytes': sum(row['bytes'] for row in files), 'mediaReencoded': False}
    (output / 'release-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / '_site')
    args = parser.parse_args()
    report = build_package(args.output)
    print(json.dumps({key: value for key, value in report.items() if key != 'files'}, ensure_ascii=False, indent=2))
