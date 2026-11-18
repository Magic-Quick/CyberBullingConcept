"""Import the approved V15.1 text without rewriting speech or inventing voice timing.

The original files are read-only inputs. The output is an editable Markdown project
whose config contains references and metadata, never a second copy of its speech.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/guardians_edition/VOICES_OF_PRODUCTION_V15_1_GUARDIANS.md'
OUTPUT = ROOT / 'repo/src/chronicles/default-project.md'
MEDIA = ROOT / 'media/interactive/chronicles'
ROMANS = ('I', 'II', 'III', 'IV', 'V')
GAME_ORDER = ('I-04', 'I-01', 'I-03', 'I-02', 'I-05')
TITLES = ('Общий поток', 'Проблемные билды и сроки', 'Очередь арта и узкие места', 'Рубежи сдачи', 'Месяц и скорость')
THEMES = ('Новые билды, общий поток недели и прошлая домашка', 'Проблемные и красные билды, сроки', 'Жёлтые билды, очередь арта и узкие места', 'Зелёные билды и сдача', 'Итоги месяца, скорость первых версий и цель')
TRACKS = [
    {'id': tid, 'label': label, 'kind': kind, 'order': i + 1, **({'channel': channel} if channel else {})}
    for i, (tid, label, kind, channel) in enumerate([
        ('V1', 'Основной кадр', 'frame', ''), ('V2', 'Скриншоты', 'image', ''),
        ('V3', 'Имена и титулы', 'nameplate', ''), ('V4', 'Экранные подписи', 'screen', ''),
        ('T1', 'Субтитры', 'subtitle', ''), ('A1', 'Голос', 'voice', 'VOICE'),
        ('A2', 'Атмосфера', 'audio', 'BASE'), ('A3', 'Нагнетание', 'audio', 'DREAD'),
        ('A4', 'Передышка', 'audio', 'PEACE'), ('A5', 'Музыка игры', 'audio', 'GAME_THINK'),
        ('A6', 'Звуковые эффекты', 'sfx', 'SFX'), ('I1', 'Живые блоки и игры', 'interactive', ''),
    ])
]


def clean_text(text: str) -> str:
    text = re.sub(r'\[[^\]\n]*\]', '', text)
    text = re.sub(r'\*\*|(?<!\w)\*|\*(?!\w)|`', '', text)
    return re.sub(r'\s+', ' ', text).strip()


def speech_key(text: str) -> str:
    """Only typographic ellipsis and whitespace may share an existing recording."""
    return re.sub(r'\s+', ' ', text.replace('…', '...')).strip()


def digest(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def point(utterance: str, word: int = 0, end: bool = False) -> dict:
    if word:
        return {'type': 'word', 'utteranceId': utterance, 'wordIndex': word, 'edge': 'end' if end else 'start', 'offset': 0}
    return {'type': 'utterance', 'utteranceId': utterance, 'edge': 'end' if end else 'start', 'offset': 0}


def scene_point(offset: float = 0) -> dict:
    return {'type': 'scene', 'offset': round(offset, 6)}


class Importer:
    def __init__(self, source: str):
        self.source = source.replace('\r\n', '\n')
        self.lines = self.source.splitlines()
        self.utterances: list[dict] = []
        self.scenes: dict[str, dict] = {}
        self.events: list[dict] = []
        self.assets: dict[str, dict] = {}
        self.clips: list[dict] = []
        self.notes: list[dict] = []
        self.explicit_ids: list[str] = []
        self.ordinals: Counter = Counter()
        self.options: dict[str, list] = defaultdict(list)
        self.directives: list[str] = []
        self.audio_files = {p.stem.lower(): p for p in (ROOT / 'repo/src/assets/audio').glob('*.mp3')}
        # Import the already calibrated levels once. Runtime values then live in
        # the Markdown config and remain editable without this legacy module.
        calibration = (ROOT / 'repo/src/AmbientManager.ts').read_text(encoding='utf-8')
        self.cue_levels = {
            match[1]: {'gain': float(match[2]), 'fadeIn': float(match[3]), 'duckBaseTo': float(match[4])}
            for match in re.finditer(r"['\"]?([A-Za-z0-9_]+)['\"]?\s*:\s*\{\s*targetVol:\s*([\d.]+),\s*fadeInSec:\s*([\d.]+),\s*duckAmbientTo:\s*([\d.]+)\s*\}", calibration)
        }
        self.create_scenes()

    def create_scenes(self):
        def add(sid, title, kind):
            self.scenes[sid] = {'id': sid, 'title': title, 'kind': kind, 'utteranceIds': [], 'duration': 0}
        add('PROLOGUE', 'Пролог', 'intro')
        add('INTRO', 'Вступление', 'intro')
        for index, (roman, gid) in enumerate(zip(ROMANS, GAME_ORDER), 1):
            add(f'HANDOFF-{index:02}', f'Слово Толе {roman}', 'handoff')
            add('GAME-' + gid, f'Интерактив {roman}', 'game')
            add('SHARED-' + gid, f'Продолжение {roman}', 'shared')
            add('ROOM-' + roman, f'Зал {roman} · {TITLES[index - 1]}', 'room')
        add('VERDICT', 'Вердикт и награды', 'verdict')
        add('EPILOGUE', 'Закрытие смены', 'epilogue')
        add('DIRECTIVES', 'Директивы Лорда', 'epilogue')
        add('GAME-COMMON', 'Общий банк реакций', 'game')

    @staticmethod
    def explicit_scene(uid: str, fallback: str) -> str:
        if uid.startswith('HANDOFF-'):
            return uid
        if uid.startswith('ROOM-'):
            return uid.split('.')[0]
        if uid.startswith('COMMON.'):
            return 'GAME-COMMON'
        if uid.startswith('I-'):
            gid, suffix = uid.split('.', 1)
            return ('SHARED-' if suffix.startswith(('ИСТОРИЯ.', 'ОБЩЕЕ_ПРОДОЛЖЕНИЕ')) else 'GAME-') + gid
        return fallback

    def add_utterance(self, uid: str, text: str, line: int, scene_id: str, local_events: list[dict] | None = None):
        text = clean_text(text)
        if not text:
            return
        if any(x['id'] == uid for x in self.utterances):
            raise ValueError('Duplicate utterance ID: ' + uid)
        self.utterances.append({'id': uid, 'text': text, 'speakerId': 'lord', 'subtitleText': None,
                                'sourceLine': line, 'textHash': digest(text), 'duration': 0})
        self.scenes[scene_id]['utteranceIds'].append(uid)
        for event in self.events:
            if event['sceneId'] == scene_id and 'at' not in event:
                event['at'] = point(uid)
        for event in local_events or []:
            word = event.pop('word', 0)
            location = point(uid, end=True) if word >= len(text.split()) else point(uid, word)
            event.update({'sceneId': scene_id, 'at': location})
            self.events.append(event)

    def parse(self):
        current = 'PROLOGUE'
        ordinary: list[str] = []
        ordinary_line = 0
        explicit = None
        voice_lines: list[str] = []
        voice_events: list[dict] = []
        in_code = False
        directive: list[str] | None = None
        active = False

        def flush():
            nonlocal ordinary, ordinary_line
            if ordinary:
                self.ordinals[current] += 1
                self.add_utterance(f'{current}.P{self.ordinals[current]:03}', ' '.join(ordinary), ordinary_line, current)
                ordinary = []

        for line_no, line in enumerate(self.lines, 1):
            stripped = line.strip()
            if stripped.startswith('```'):
                flush()
                in_code = not in_code
                if not in_code and directive:
                    self.directives.append('\n'.join(directive).strip())
                    directive = None
                continue
            if in_code:
                if stripped.startswith('[ДИРЕКТИВА'):
                    if directive:
                        self.directives.append('\n'.join(directive).strip())
                    directive = [stripped]
                elif directive is not None and stripped and not all(c in '═╔╗╚╝║ ' for c in stripped):
                    directive.append(stripped)
                continue
            if stripped.startswith('### Служебный банк'):
                flush(); current = 'GAME-COMMON'; active = False
                continue
            new_scene = None
            if stripped.startswith('#### Пролог:'):
                new_scene = 'PROLOGUE'
            elif stripped.startswith('#### Интро:'):
                new_scene = 'INTRO'
            elif match := re.match(r'#### Перед залом ([IV]+):', stripped):
                new_scene = f'HANDOFF-{ROMANS.index(match[1]) + 1:02}'
            elif match := re.match(r'#### Игровое вступление · (I-\d+)', stripped):
                new_scene = 'GAME-' + match[1]
            elif match := re.match(r'### \[ЗАЛ ([IV]+):', stripped):
                new_scene = 'ROOM-' + match[1]
            elif stripped.startswith('### [ВЕРДИКТ:'):
                new_scene = 'VERDICT'
            elif stripped.startswith('### [ЭПИЛОГ:'):
                new_scene = 'EPILOGUE'
            elif match := re.match(r'\[ОБЩЕЕ ПРОДОЛЖЕНИЕ (I-\d+):', stripped):
                new_scene = 'SHARED-' + match[1]
            if new_scene:
                flush(); current = new_scene
                active = self.scenes[current]['kind'] in ('intro', 'room', 'verdict', 'epilogue')
                continue
            if match := re.match(r'\[ГОЛОС ЛОРДА ([^\]]+)\]', stripped):
                flush()
                if explicit:
                    raise ValueError(f'Nested voice block at {line_no}')
                uid = match[1]
                explicit = (uid, line_no, self.explicit_scene(uid, current))
                self.explicit_ids.append(uid)
                voice_lines, voice_events = [], []
                continue
            if stripped == '[КОНЕЦ РЕПЛИКИ]':
                if not explicit:
                    raise ValueError(f'Unmatched end of voice block at {line_no}')
                uid, start, scene_id = explicit
                self.add_utterance(uid, ' '.join(voice_lines), start, scene_id, voice_events)
                explicit = None
                continue
            if explicit:
                last = 0
                for tag_match in re.finditer(r'\[[^\]\n]+\]', line):
                    voice_lines.append(line[last:tag_match.start()])
                    word_count = len(clean_text(' '.join(voice_lines)).split())
                    voice_events.append({'raw': tag_match.group(), 'line': line_no, 'word': word_count})
                    last = tag_match.end()
                voice_lines.append(line[last:])
                continue
            if stripped.startswith(('**Лорд:', '**Голос хроник:')):
                active = True
                continue
            if not stripped:
                flush(); continue
            if stripped == '---':
                flush(); continue
            # Decorative HUD descriptors are not voice. Preserve actual screen content.
            if stripped.startswith('🏷'):
                flush()
                if '/ ДАШБОРД]' in stripped or '/ ПЛАШКА КЛИЕНТА]' in stripped:
                    label, value = stripped.split(']:', 1)
                    self.events.append({'raw': '[DISPLAY_TEXT: ' + value.strip() + ']', 'sceneId': current, 'line': line_no})
                continue
            if stripped.startswith('['):
                flush()
                event = {'raw': stripped, 'sceneId': current, 'line': line_no}
                if stripped.startswith('[ЗАКРЫТЬ СЛАК'):
                    prev = self.scenes[current]['utteranceIds']
                    if prev:
                        event['at'] = point(prev[-1], end=True)
                self.events.append(event)
                if match := re.match(r'\[ВАРИАНТ ([ABCD]):\s*(.*?)\]', stripped):
                    if current.startswith('GAME-'):
                        self.options[current[5:]].append({'id': match[1], 'text': match[2]})
                continue
            if stripped.startswith(('#', '>', '|', '╔', '║', '╚', '═')):
                flush(); continue
            if active and self.scenes[current]['kind'] in ('intro', 'room', 'verdict', 'epilogue'):
                if not ordinary:
                    ordinary_line = line_no
                ordinary.append(stripped)
        flush()
        if explicit:
            raise ValueError('Unclosed voice block: ' + explicit[0])
        if len(self.explicit_ids) != 107:
            raise ValueError(f'Expected 107 source blocks; found {len(self.explicit_ids)}')
        self.check_source_blocks()

    def check_source_blocks(self):
        source = dict(re.findall(r'\[ГОЛОС ЛОРДА ([^\]]+)\]\s*([\s\S]*?)\[КОНЕЦ РЕПЛИКИ\]', self.source))
        actual = {u['id']: u['text'] for u in self.utterances}
        errors = [uid for uid, text in source.items() if actual.get(uid) != clean_text(text)]
        if errors:
            raise ValueError('Speech changed during import: ' + ', '.join(errors))

    def asset(self, value: str, kind: str, label: str = '') -> str:
        aid = f'{kind}:{value}'
        if aid in self.assets:
            return aid
        is_path = '/' in value or '\\' in value
        entry = {'id': aid, 'kind': kind, 'path' if is_path else 'key': value}
        if label:
            entry['label'] = label
        if kind == 'audio':
            path = ROOT / value if is_path else self.audio_files.get(value.lower())
            if path and path.is_file():
                try:
                    import av
                    with av.open(str(path)) as audio:
                        if audio.duration:
                            entry['duration'] = round(audio.duration / av.time_base, 6)
                except (ImportError, OSError, ValueError):
                    pass
        self.assets.setdefault(aid, entry)
        return aid

    def load_audio(self):
        old_root = ROOT / 'media/interactive/scenes'
        old = json.loads((old_root / 'protocol_gate_voice/manifest.json').read_text(encoding='utf-8'))['clips']
        recordings = {}
        for clip in old.values():
            path = (old_root / clip['file']).relative_to(ROOT).as_posix()
            if (ROOT / path).is_file():
                recordings[speech_key(clip['text'])] = {**clip, 'file': path, 'duration': clip.get('duration_seconds_rounded', 0)}
        generated_path = MEDIA / 'generated-voice.json'
        generated = json.loads(generated_path.read_text(encoding='utf-8')).get('clips', {}) if generated_path.exists() else {}
        # Accept only a matching text recipe and an actual file.
        for clip in generated.values():
            if clip.get('file') and (ROOT / clip['file']).is_file():
                recordings[speech_key(clip['text'])] = clip
        rows = []
        for u in self.utterances:
            recording = generated.get(u['id'])
            if not recording or speech_key(recording.get('text', '')) != speech_key(u['text']) or not (ROOT / recording.get('file', '__missing__')).is_file():
                recording = recordings.get(speech_key(u['text']))
            row = {'id': u['id'], 'text': u['text'], 'text_sha256': u['textHash'], 'file': None, 'duration': None, 'status': 'missing'}
            if recording:
                aid = self.asset(recording['file'], 'audio', u['id'])
                audio_text_hash = recording.get('text_sha256', digest(recording['text']))
                # A typography alias retains the original audio recipe for diagnostics.
                u.update(audioAssetId=aid, duration=recording.get('duration', 0), audioTextHash=audio_text_hash)
                if recording.get('words'):
                    u['words'] = recording['words']
                self.assets[aid].update(duration=u['duration'], sha256=hashlib.sha256((ROOT / recording['file']).read_bytes()).hexdigest())
                row.update(file=recording['file'], duration=u['duration'], status='reused', audio_text_sha256=audio_text_hash)
            rows.append(row)
        MEDIA.mkdir(parents=True, exist_ok=True)
        manifest = {'schemaVersion': 1, 'source': SOURCE.relative_to(ROOT).as_posix(), 'source_sha256': digest(self.source),
                    'voice_id': 'GquPFn9xormgmHaJ2KdN', 'model_id': 'eleven_multilingual_v2',
                    'utterances': rows}
        (MEDIA / 'voice-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        return manifest

    def materialize_events(self):
        by_scene = defaultdict(list)
        for event in self.events:
            by_scene[event['sceneId']].append(event)
        for scene_id, events in by_scene.items():
            scene = self.scenes[scene_id]
            uids = scene['utteranceIds']
            for event in events:
                event.setdefault('at', point(uids[-1], end=True) if uids else scene_point())
            open_slack = None
            for event in events:
                raw, line, at = event['raw'], event['line'], event['at']
                body = raw[1:-1]
                common = {'id': f'{scene_id}.L{line}', 'sceneId': scene_id, 'start': at}
                if scene['kind'] == 'game' and at.get('utteranceId'):
                    common['event'] = at['utteranceId']
                if raw.startswith('[КАДР:'):
                    fields = body[5:].split('|', 1)
                    key = fields[0].strip()
                    if key == 'None':
                        # An explicit black image is represented by an asset-less frame.
                        clip = {**common, 'trackId': 'V1', 'kind': 'frame', 'label': 'Чистый чёрный кадр', 'duration': 0}
                    else:
                        clip = {**common, 'trackId': 'V1', 'kind': 'frame', 'assetId': self.asset(key, 'image'),
                                'label': fields[1].strip() if len(fields) > 1 else key, 'duration': 0,
                                'transform': {'x': 0.5, 'y': 0.5, 'width': 1, 'height': 1, 'opacity': 1}}
                    self.clips.append(clip)
                elif raw.startswith('[СЛАК:'):
                    key = body[5:].split('|', 1)[0].strip()
                    if open_slack:
                        open_slack['end'] = at
                    open_slack = {**common, 'trackId': 'V2', 'kind': 'image', 'assetId': self.asset(key, 'image'),
                                  'label': 'Переписка', 'duration': 0, 'transform': {'x': .74, 'y': .30, 'width': .42, 'opacity': 1},
                                  'fadeIn': .15, 'fadeOut': .15}
                    self.clips.append(open_slack)
                elif raw.startswith('[ЗАКРЫТЬ СЛАК'):
                    if open_slack:
                        open_slack['end'] = at
                        open_slack = None
                elif raw.startswith('[ПЕРСОНАЖ:'):
                    fields = [s.strip() for s in body[10:].split('|')]
                    self.clips.append({**common, 'trackId': 'V3', 'kind': 'nameplate', 'text': fields[0],
                                       'title': fields[1] if len(fields) > 1 else '',
                                       'color': next((m[1] for f in fields if (m := re.search(r'(#[a-fA-F0-9]{6})', f))), '#e9b65f'),
                                       'duration': 6, 'transform': {'x': .08, 'y': .72, 'width': .55, 'opacity': 1}})
                elif raw.startswith('[DISPLAY_TEXT:'):
                    value = body.split(':', 1)[1].strip()
                    # Header metrics can reveal a later punchline. Keep them for the
                    # director, disabled until an exact reveal anchor is assigned.
                    parts = value.split(' // ')
                    safe_at = {**at, 'offset': at.get('offset', 0) + 3}
                    self.clips.append({**common, 'start': safe_at, 'trackId': 'V4', 'kind': 'screen', 'text': parts[0], 'duration': 5,
                                       'transform': {'x': .5, 'y': .12, 'width': .8, 'opacity': 1}})
                    if len(parts) > 1:
                        self.clips.append({**common, 'id': common['id'] + '.metrics', 'trackId': 'V4', 'kind': 'screen',
                                           'text': ' // '.join(parts[1:]), 'label': 'Назначить момент раскрытия метрик',
                                           'enabled': False, 'duration': 5, 'transform': {'x': .5, 'y': .12, 'width': .8, 'opacity': 1}})
                elif raw.startswith('[ЭКРАН:'):
                    value = body.split(':', 1)[1].strip()
                    if value.startswith('«') and value.endswith('»'):
                        self.clips.append({**common, 'trackId': 'V4', 'kind': 'screen', 'text': value[1:-1], 'duration': 4,
                                           'transform': {'x': .5, 'y': .16, 'width': .7, 'opacity': 1}})
                    # Other screen directions are editorial instructions, never on-screen prose.
                elif raw.startswith(('[ЗВУК:', '[SFX:')):
                    is_sfx = raw.startswith('[SFX:')
                    fields = [s.strip() for s in body.split(':', 1)[1].split('|')]
                    kind = 'SFX' if is_sfx else fields[0]
                    key = fields[0] if is_sfx else (fields[1] if len(fields) > 1 else '')
                    instruction = ' | '.join(fields[1:] if is_sfx else fields[2:])
                    condition = re.search(r'условие:\s*([^;,]+)', instruction)
                    if condition:
                        common['event'] = condition[1].strip()
                    if kind in ('тишина', 'приглушить'):
                        target = key.upper().strip()
                        self.clips.append({**common, 'trackId': {'BASE':'A2','DREAD':'A3','PEACE':'A4','GAME_THINK':'A5'}.get(target,'A2'), 'kind': 'audio',
                                           'label': kind + ' · ' + key, 'text': instruction,
                                           'audioCommand': {'action': 'duck' if kind == 'приглушить' else 'silence', 'channel': target, 'gain': .05 if kind == 'приглушить' else 0},
                                           'duration': 0})
                    elif key:
                        track = {'фон': 'A2', 'нагнетающий': 'A3', 'добрый': 'A4', 'игровой': 'A5', 'SFX': 'A6'}.get(kind, 'A2')
                        gain = .2 if track == 'A5' else .15 if track == 'A2' else .4
                        aid = self.asset(key, 'audio')
                        length = self.assets[aid].get('duration', 0) if is_sfx else 0
                        limit = re.search(r'максимум\s+([\d.,]+)\s*с', instruction)
                        if is_sfx and limit:
                            length = min(length, float(limit[1].replace(',', '.'))) if length else float(limit[1].replace(',', '.'))
                        self.clips.append({**common, 'trackId': track, 'kind': 'sfx' if is_sfx else 'audio',
                                           'assetId': aid, 'label': kind, 'text': instruction,
                                           'gain': gain, 'loop': 'петл' in instruction or 'по кругу' in instruction,
                                           'fadeIn': .8 if track == 'A2' else .1, 'fadeOut': .22, 'duration': length,
                                           **self.cue_levels.get(key, {})})
            if open_slack and uids:
                open_slack['end'] = point(uids[-1], end=True)

    def apply_neutral_portraits(self):
        manifest = MEDIA / 'neutral-portraits.json'
        if not manifest.exists():
            return
        reviewed = json.loads(manifest.read_text(encoding='utf-8'))
        clips = {c['id']: c for c in self.clips}
        for override in reviewed['frameOverrides']:
            clip = clips[override['frameClipId']]
            portrait = reviewed['portraits'][override['portraitId']]
            clip['assetId'] = self.asset(portrait['path'], 'image', 'Чистый портрет · ' + portrait['name'])
            clip['label'] = 'Чистый портрет · ' + portrait['name']
        for portrait_id, reveal in reviewed['fullSourceAllowedFrom'].items():
            self.clips.append({'id': 'reveal.' + portrait_id, 'sceneId': reveal['sceneId'], 'trackId': 'V1',
                               'kind': 'frame', 'assetId': self.asset(reveal['assetKey'], 'image'),
                               'label': 'Сюжетный кадр после упоминания', 'start': reveal['allowedFrom'], 'duration': 0,
                               'transform': {'x': .5, 'y': .5, 'width': 1, 'height': 1, 'opacity': 1}})

    def arrange(self):
        utterances = {u['id']: u for u in self.utterances}
        by_scene = defaultdict(list)
        for clip in self.clips:
            by_scene[clip['sceneId']].append(clip)
        for scene in self.scenes.values():
            cursor = 0.0
            last_portrait = None
            speech_ranges = {}
            for uid in scene['utteranceIds']:
                u = utterances[uid]
                incoming = [c for c in by_scene[scene['id']] if c['start'].get('utteranceId') == uid and c['start'].get('wordIndex', 0) == 0 and c['start'].get('edge') != 'end']
                cards = [c for c in incoming if c['kind'] == 'nameplate']
                frames = [c for c in incoming if c['kind'] == 'frame']
                if cards:
                    # Identity reveal is the only pre-speech picture exception.
                    for card in cards:
                        card_line = int(card['id'].rsplit('L', 1)[1])
                        preceding = [f for f in frames if int(f['id'].rsplit('L', 1)[1]) < card_line]
                        frame = preceding[-1] if preceding else None
                        if frame and any(token in frame.get('assetId', '') for token in ('mickey', 'autopsy', 'speedrun')):
                            name = card.get('text', '').lower()
                            neutral = 'avatar_egor' if 'егор' in name and 'егоров' not in name else 'avatar_nick_egorov' if 'егоров' in name else 'avatar_eduard' if 'левин' in name else None
                            if neutral:
                                frame['assetId'] = self.asset(neutral, 'image')
                                frame['label'] = 'Нейтральный портрет: ' + card.get('text', '')
                        frame_key = frame.get('assetId') if frame else None
                        if frame_key != last_portrait or last_portrait is None:
                            if frame:
                                frame['start'] = scene_point(cursor)
                            card['start'] = scene_point(cursor + 3)
                            cursor += 6
                            last_portrait = frame_key
                        else:
                            card['start'] = scene_point(cursor)
                duration = float(u.get('duration') or 0)
                voice = {'id': 'voice.' + uid, 'sceneId': scene['id'], 'trackId': 'A1', 'kind': 'voice',
                         'utteranceId': uid, 'label': uid, 'start': scene_point(cursor), 'duration': duration, 'gain': 1}
                if u.get('audioAssetId'):
                    voice['assetId'] = u['audioAssetId']
                if scene['kind'] == 'game':
                    voice['event'] = uid
                self.clips.append(voice)
                speech_ranges[uid] = (cursor, cursor + duration)
                self.clips.append({'id': 'subtitle.' + uid, 'sceneId': scene['id'], 'trackId': 'T1', 'kind': 'subtitle',
                                   'utteranceId': uid, 'start': point(uid), 'end': point(uid, end=True), 'duration': duration,
                                   **({'event': uid} if scene['kind'] == 'game' else {})})
                cursor += duration
            scene['duration'] = round(cursor, 6)
            # Commands without explicit ends hold to the next command on their visual/music layer.
            # Keep symbolic refs so moving a speech block carries its frame with it.
            def resolve_start(ref):
                if ref['type'] == 'scene':
                    return ref['offset']
                start, end = speech_ranges.get(ref.get('utteranceId'), (0, 0))
                if ref['type'] == 'word':
                    words = utterances[ref['utteranceId']].get('words', [])
                    index = ref.get('wordIndex', 0)
                    if index < len(words):
                        return start + words[index]['end' if ref.get('edge') == 'end' else 'start'] + ref['offset']
                return (end if ref.get('edge') == 'end' else start) + ref['offset']
            if scene['kind'] != 'game':
                closing_frames = [c for c in by_scene[scene['id']] if c['kind'] == 'frame' and abs(resolve_start(c['start']) - cursor) < .000001]
                if closing_frames:
                    cursor += max(c.get('cleanExposure', 0) for c in closing_frames)
                    scene['duration'] = round(cursor, 6)
            for track in ('V1', 'V3', 'V4', 'A2', 'A3', 'A4', 'A5'):
                lane = sorted((c for c in by_scene[scene['id']] if c['trackId'] == track), key=lambda c: resolve_start(c['start']))
                for index, clip in enumerate(lane):
                    if 'end' in clip or clip.get('duration', 0) > 0:
                        continue
                    following = lane[index + 1:]
                    if clip['kind'] == 'audio' and clip.get('assetId'):
                        # Commands adjust the continuing source; they never cut
                        # it or reset its playback position by themselves.
                        following = [c for c in following if c.get('assetId')]
                    elif clip.get('audioCommand'):
                        following = [c for c in following if c.get('assetId') or c.get('audioCommand',{}).get('channel') == clip['audioCommand']['channel']]
                    clip['end'] = following[0]['start'] if following else scene_point(cursor)
        # Directed screen-only cards have a finite, editable reading interval.
        scene = self.scenes['DIRECTIVES']
        scene['duration'] = 30
        for i, content in enumerate(self.directives):
            self.clips.append({'id': f'directive.{i + 1}', 'sceneId': 'DIRECTIVES', 'trackId': 'V4', 'kind': 'screen',
                               'text': content, 'start': scene_point(i * 15), 'duration': 15,
                               'transform': {'x': .5, 'y': .45, 'width': .84, 'opacity': 1}})

    def games(self):
        utterances = {u['id']: u for u in self.utterances}
        context_manifest = ROOT / 'media/interactive/chronicles/context-assets.json'
        contexts = json.loads(context_manifest.read_text(encoding='utf-8')).get('games', {}) if context_manifest.exists() else {}
        stops = []
        reaction_map = {
            'ВЕРНО': 'correct', 'ОШИБКА': 'wrong', 'ПУСТО': 'empty', 'ПОВТОР': 'repeat',
            'БУКВА.ВЕРНО': 'letter_correct', 'БУКВА.ДРУГОЕ_МЕСТО': 'letter_misplaced',
            'БУКВА.НЕВЕРНО': 'letter_wrong', 'СЛОВО.НЕВЕРНО': 'word_wrong',
            'ВВОД.НЕКОРРЕКТНАЯ_БУКВА': 'invalid', 'ВВОД.НЕКОРРЕКТНОЕ_СЛОВО': 'invalid_word',
            'ВВОД.ПУСТО': 'empty', 'ВВОД.НЕЗАВЕРШЕНО': 'incomplete', 'ВВОД.СЛИШКОМ_ДЛИННО': 'too_long',
            'ПОДСКАЗКА.БУКВА': 'letter_prompt', 'ПОДСКАЗКА.СЛОВО': 'word_prompt',
            'ПЕРВЫЙ_ВЫБОР': 'first_choice', 'РАСКРЫТИЕ': 'reveal', 'РАСКРЫТИЕ_ОТВЕТА': 'reveal',
        }
        for index, (roman, gid) in enumerate(zip(ROMANS, GAME_ORDER), 1):
            prefix = gid + '.'
            ids = self.scenes['GAME-' + gid]['utteranceIds']
            intro = [gid + '.' + suffix for suffix in ('ВХОД', 'КОНТЕКСТ', 'ВОПРОС', 'ВАРИАНТЫ') if gid + '.' + suffix in utterances]
            reactions = defaultdict(list)
            for uid in ids:
                if uid in intro:
                    continue
                suffix = uid[len(prefix):]
                exact = suffix
                if suffix.startswith('ОШИБКА.') and suffix[-1] in 'ABD':
                    reactions['wrong.' + suffix[-1]].append(uid)
                    continue
                suffix = re.sub(r'\.\d+$', '', suffix)
                reactions[reaction_map.get(suffix, exact)].append(uid)
            if gid in ('I-04', 'I-01', 'I-05'):
                reactions['exhausted'] = ['COMMON.ЛИМИТ']
            game = {'id': gid, 'kind': 'choice' if gid in ('I-04', 'I-02') else 'free' if gid == 'I-03' else 'word',
                    'question': utterances[gid + '.ВОПРОС']['text'], 'introIds': intro,
                    'maxWrong': 3 if gid in ('I-04', 'I-01', 'I-05') else 1 if gid == 'I-03' else None,
                    'reactions': dict(reactions)}
            if gid in self.options:
                game['options'] = [{**o, 'correct': gid == 'I-02' or o['id'] == 'C'} for o in self.options[gid]]
            if gid == 'I-01':
                game.update(answer='демоблил', acceptedAnswers=['демоблил'])
            elif gid == 'I-05':
                game.update(answer='пулзы', acceptedAnswers=['пулзы'])
            elif gid == 'I-03':
                game.update(answer='глаза', acceptedAnswers=['глаза', 'глазами', 'свои глаза', 'своими глазами', 'зрение', 'собственное зрение'])
            elif gid == 'I-04':
                game['answer'] = 'C'
            else:
                game['revealAll'] = True
            if game['kind'] == 'word':
                game['thinkingAssetId'] = self.asset('media/interactive/pole_chudes/audio/02_think_60s_pole_cudes-60-seconds.mp3', 'audio')
                game['correctAssetId'] = self.asset('media/interactive/pole_chudes/audio/01_letter_correct_pole_letter_correct.mp3', 'audio')
                game['wrongAssetId'] = self.asset('media/interactive/pole_chudes/audio/07_letter_wrong_pole_letter_wrong.mp3', 'audio')
                game['winAssetId'] = self.asset('media/interactive/pole_chudes/audio/32_word_correct_pole_word_1996.mp3', 'audio')
            elif gid in ('I-04', 'I-02'):
                filename = '03_question_bed_q1-5-bed-2008.mp3' if gid == 'I-04' else '17_question_medium_q6-2000-clock.mp3'
                game['thinkingAssetId'] = self.asset('media/interactive/millionaire/audio/' + filename, 'audio')
                if gid == 'I-04':
                    game['wrongAssetId'] = self.asset('media/interactive/millionaire/audio/24_wrong_medium_khsm_q6-wrong.mp3', 'audio')
            for clip in self.clips:
                if clip['sceneId'] == 'GAME-' + gid and clip.get('event') == 'WAIT_' + gid:
                    clip['start'] = point(intro[-1], end=True)
                    clip['end'] = point(intro[-1], end=True)  # State-owned waiting has no pretend timeline length.
            for clip in self.clips:
                if clip['sceneId'] == 'GAME-' + gid and clip['kind'] in ('frame', 'nameplate') and clip.get('event') in intro:
                    del clip['event']
            # Read the verified context manifest: prepared Slack crops, an honest
            # portrait fallback for Househunt and an authentic sync transcript.
            context = contexts.get(gid, {})
            context_path = ROOT / context['path'] if context.get('path') else None
            if context_path and context_path.is_file() and not context.get('pending'):
                aid = self.asset(context['path'], 'image', 'Контекст игры ' + gid)
                if context.get('sha256'):
                    self.assets[aid]['sha256'] = context['sha256']
                game['contextAssetId'] = aid
                show_at = point(intro[-1], end=True)
                if gid == 'I-03':
                    words = utterances[gid + '.КОНТЕКСТ']['text'].split()
                    word_index = next(i for i, word in enumerate(words) if word.lower().strip('.,:!?') == 'внимание')
                    show_at = point(gid + '.КОНТЕКСТ', word_index)
                self.clips.append({'id': f'context.{gid}', 'sceneId': 'GAME-' + gid, 'trackId': 'V2', 'kind': 'image',
                                   'assetId': aid, 'label': context.get('sourceLabel', 'Контекст игры'),
                                   'start': show_at, 'end': scene_point(self.scenes['GAME-' + gid]['duration']),
                                   'transform': {'x': .5, 'y': .26, 'width': .64, 'opacity': 1}, 'fadeIn': .15, 'fadeOut': .15})
            stops.append({'id': 'STOP-' + roman, 'label': 'Интерактив ' + roman, 'theme': THEMES[index - 1],
                          'handoffSceneId': f'HANDOFF-{index:02}', 'gameSceneId': 'GAME-' + gid,
                          'roomSceneId': 'ROOM-' + roman, 'game': game})
        return stops

    def preserve_legacy_song(self):
        """Keep the completed music performance as an optional, non-narrative extra."""
        path = ROOT / 'repo/src/storyData.ts'
        if not path.exists():
            return []
        text = path.read_text(encoding='utf-8-sig')
        marker = text.index('export const STORY_ACTS')
        start = text.index('[', text.index('=', marker))
        acts = json.loads(re.sub(r',(?=\s*[}\]])', '', text[start:text.rindex(']') + 1]))
        song = next((a for a in acts if a['id'] == 'act_7_song'), None)
        if not song:
            return []
        duration = song['duration']
        self.scenes['SONG'] = {'id': 'SONG', 'title': 'Музыкальный финал', 'kind': 'song', 'utteranceIds': [], 'duration': duration}
        self.clips.append({'id': 'song.audio', 'sceneId': 'SONG', 'trackId': 'A2', 'kind': 'audio',
                           'assetId': self.asset('servotorization', 'audio'), 'label': 'Готовая музыкальная запись',
                           'start': scene_point(), 'duration': duration, 'gain': .8, 'loop': False, 'fadeOut': .3})
        self.clips.append({'id': 'song.frame', 'sceneId': 'SONG', 'trackId': 'V1', 'kind': 'frame',
                           'assetId': self.asset('ai_lord_calm_singing', 'image'), 'start': scene_point(), 'duration': duration,
                           'transform': {'x': .5, 'y': .5, 'width': 1, 'height': 1, 'opacity': 1}})
        for i, cue in enumerate(song['cues']):
            self.clips.append({'id': f'song.caption.{i:03}', 'sceneId': 'SONG', 'trackId': 'T1', 'kind': 'subtitle',
                               'text': cue['text'], 'start': scene_point(cue['start']),
                               'duration': max(0, cue['end'] - cue['start'])})
        return [{'kind': 'scene', 'sceneId': 'SONG'}]

    def build(self):
        self.parse()
        manifest = self.load_audio()
        self.materialize_events()
        self.apply_neutral_portraits()
        for clip in self.clips:
            if clip['kind'] == 'frame':
                clip['cleanExposure'] = 3
        self.arrange()
        stops = self.games()
        extras = self.preserve_legacy_song()
        sequence = [{'kind': 'scene', 'sceneId': 'PROLOGUE'}, {'kind': 'scene', 'sceneId': 'INTRO'}]
        for roman, gid in zip(ROMANS, GAME_ORDER):
            sequence.extend([{'kind': 'stop', 'stopId': 'STOP-' + roman}, {'kind': 'scene', 'sceneId': 'SHARED-' + gid},
                             {'kind': 'scene', 'sceneId': 'ROOM-' + roman}])
        sequence.extend({'kind': 'scene', 'sceneId': sid} for sid in ('VERDICT', 'EPILOGUE', 'DIRECTIVES'))
        project = {'schemaVersion': 1, 'id': 'chronicles-14-guardians-v15', 'title': 'Хроники Продакшен-Ковчега',
                   'sourceScript': SOURCE.relative_to(ROOT).as_posix(), 'tracks': TRACKS, 'assets': list(self.assets.values()),
                   'utterances': [{k: v for k, v in u.items() if k != 'text'} for u in self.utterances],
                   'scenes': list(self.scenes.values()), 'clips': self.clips, 'stops': stops, 'sequence': sequence, 'extras': extras}
        return project, manifest

    def markdown(self, project: dict) -> str:
        output = ['# Хроники Продакшен-Ковчега · монтажный проект', '',
                  '> Импорт V15.1. Речь сохранена; исходные V15/V15.1 не изменены. Длительность 0 означает отсутствующую запись, а не готовый монтаж.', '',
                  '> Источник: `' + SOURCE.relative_to(ROOT).as_posix() + '`; SHA-256: `' + digest(self.source) + '`.', '']
        by_id = {u['id']: u for u in self.utterances}
        references = defaultdict(list)
        clip_ids = {c['id'] for c in project['clips']}
        for event in self.events:
            cid = f"{event['sceneId']}.L{event['line']}"
            if event.get('at', {}).get('utteranceId') and cid in clip_ids:
                references[event['at']['utteranceId']].append(cid)
        for scene in self.scenes.values():
            output.extend(['## ' + scene['title'], '', '[СЦЕНА: ' + scene['id'] + ']', ''])
            for uid in scene['utteranceIds']:
                output.extend('[СОБЫТИЕ: ' + cid + ']' for cid in references[uid])
                output.extend(['[ГОЛОС ЛОРДА ' + uid + ']', by_id[uid]['text'], '[КОНЕЦ РЕПЛИКИ]', ''])
        output.extend(['## Сценарные заметки импорта', '',
                       '> Исходные постановочные инструкции сохранены для редакторской проверки. Исполняемые значения находятся только в конфиге ниже; этот раздел не озвучивается.', ''])
        for event in self.events:
            output.append(f"> Строка {event['line']} · {event['sceneId']}: {event['raw']}")
        output.append('')
        output.extend(['## Конфиг монтажа', '', '```chronicles-config', json.dumps(project, ensure_ascii=False, indent=2), '```', ''])
        return '\n'.join(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=SOURCE)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    importer = Importer(args.source.read_text(encoding='utf-8-sig'))
    project, manifest = importer.build()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(importer.markdown(project), encoding='utf-8')
    report = {'sourceSha256': digest(importer.source), 'sourceExplicitBlocks': len(importer.explicit_ids),
              'ordinarySpeechBlocks': len(importer.utterances) - len(importer.explicit_ids),
              'totalSpeechBlocks': len(importer.utterances), 'sourceSpeechWords': sum(len(u['text'].split()) for u in importer.utterances),
              'scenes': len(project['scenes']), 'clips': len(project['clips']), 'stops': len(project['stops']),
              'voiceStatus': dict(Counter(row['status'] for row in manifest['utterances'])),
              'musicAndSfxCommands': sum(1 for e in importer.events if e['raw'].startswith(('[ЗВУК:', '[SFX:'))),
              'missingVoiceIds': [row['id'] for row in manifest['utterances'] if row['status'] == 'missing']}
    report_path = MEDIA / 'import-report.json'
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'missingVoiceIds'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
