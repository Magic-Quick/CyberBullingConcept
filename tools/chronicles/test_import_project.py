"""Invariants for the real V15.1 import, not a copy of its parser implementation."""
import importlib.util
import json
import re
import tempfile
import unittest
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('import_project', HERE / 'import_project.py')
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class ChroniclesImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.old_media = module.MEDIA
        module.MEDIA = Path(cls.tmp.name)
        cls.importer = module.Importer(module.SOURCE.read_text(encoding='utf-8-sig'))
        cls.project, cls.manifest = cls.importer.build()
        cls.by_id = {u['id']: u for u in cls.importer.utterances}

    @classmethod
    def tearDownClass(cls):
        module.MEDIA = cls.old_media
        cls.tmp.cleanup()

    def test_all_approved_speech_including_ordinary_prose_survives(self):
        # The un-directed author edition has different paragraph cuts. Its full
        # token stream is an independent control for dropped/added source speech.
        author_path = module.ROOT / 'docs/guardians_edition/VOICES_OF_PRODUCTION_V15_GUARDIANS.md'
        author = module.Importer(author_path.read_text(encoding='utf-8-sig'))
        author.parse()
        tokens = lambda obj: re.findall(r'\w+|[^\w\s]', ' '.join(u['text'] for u in obj.utterances).lower())
        self.assertEqual(tokens(author), tokens(self.importer))
        self.assertEqual(len(self.importer.explicit_ids), 107)
        # Author editions can gain paragraphs; the token comparison above guards
        # exact speech, independently of paragraph boundaries.
        self.assertGreaterEqual(len(self.importer.utterances), 242)

    def test_conditional_reactions_never_enter_the_linear_route(self):
        route = self.project['sequence']
        scenes = {s['id']: s for s in self.project['scenes']}
        self.assertEqual([n['stopId'] for n in route if n['kind'] == 'stop'], ['STOP-' + r for r in module.ROMANS])
        self.assertFalse(any(scenes[n['sceneId']]['kind'] in ('game', 'handoff') for n in route if n['kind'] == 'scene'))
        counts = Counter(uid for scene in scenes.values() for uid in scene['utteranceIds'])
        self.assertEqual(set(counts), set(self.by_id))
        self.assertTrue(all(count == 1 for count in counts.values()))

    def test_each_game_retains_its_distinct_final_rules(self):
        games = {s['game']['id']: s['game'] for s in self.project['stops']}
        self.assertEqual([s['game']['id'] for s in self.project['stops']], list(module.GAME_ORDER))
        self.assertEqual([s['handoffSceneId'] for s in self.project['stops']], [f'HANDOFF-{i:02}' for i in range(1, 6)])
        self.assertTrue(games['I-02']['revealAll'])
        self.assertIsNone(games['I-02']['maxWrong'])
        self.assertTrue(all(o['correct'] for o in games['I-02']['options']))
        self.assertEqual(games['I-03']['maxWrong'], 1)
        self.assertEqual(len(games['I-03']['reactions']['wrong']), 1)
        self.assertEqual(games['I-03']['acceptedAnswers'], ['глаза', 'глазами', 'свои глаза', 'своими глазами', 'зрение', 'собственное зрение'])
        for gid in ('I-02', 'I-03'):
            self.assertNotIn('exhausted', games[gid]['reactions'])
        for gid in ('I-04', 'I-01', 'I-05'):
            self.assertEqual(games[gid]['maxWrong'], 3)
            self.assertEqual(games[gid]['reactions']['exhausted'], ['COMMON.ЛИМИТ'])
        self.assertEqual(len(games['I-01']['answer']), 8)
        self.assertEqual(len(games['I-05']['answer']), 5)

    def test_voice_reuse_is_exact_or_a_typographic_ellipsis_alias(self):
        reused = [u for u in self.manifest['utterances'] if u['status'] == 'reused']
        self.assertEqual(len(reused), 35)
        self.assertEqual(len({u['file'] for u in reused}), 31)
        self.assertTrue(all((module.ROOT / u['file']).is_file() for u in reused))
        self.assertTrue(all(self.by_id[u['id']]['duration'] == 0 for u in self.manifest['utterances'] if u['status'] == 'missing'))

    def test_markdown_keeps_one_speech_copy_and_no_voice_in_config(self):
        document = self.importer.markdown(self.project)
        content, raw = document.split('```chronicles-config\n')
        config = json.loads(raw.split('\n```', 1)[0])
        self.assertFalse(any('text' in u for u in config['utterances']))
        voices = re.findall(r'\[ГОЛОС ЛОРДА ([^\]]+)\]\n([\s\S]*?)\n\[КОНЕЦ РЕПЛИКИ\]', content)
        self.assertEqual(len(voices), len(self.importer.utterances))
        self.assertEqual(dict(voices), {u['id']: u['text'] for u in self.importer.utterances})
        self.assertIn('[СОБЫТИЕ:', content)
        self.assertIn('Сценарные заметки импорта', content)

    def test_all_music_commands_are_preserved_and_wait_belongs_to_question_end(self):
        commands = [e for e in self.importer.events if e['raw'].startswith(('[ЗВУК:', '[SFX:'))]
        self.assertEqual(len(commands), 155)
        ids = {c['id'] for c in self.project['clips']}
        self.assertTrue(all(f"{e['sceneId']}.L{e['line']}" in ids for e in commands))
        controls = [c for c in self.project['clips'] if c.get('audioCommand')]
        self.assertEqual(len(controls), 98)
        self.assertTrue(all(not c.get('assetId') and 'gain' not in c for c in controls))
        self.assertEqual({c['audioCommand']['channel'] for c in controls}, {'GAME_THINK', 'ALL_MUSIC'})
        for stop in self.project['stops']:
            gid = stop['game']['id']
            waiting = [c for c in self.project['clips'] if c.get('event') == 'WAIT_' + gid]
            self.assertTrue(waiting)
            for clip in waiting:
                self.assertEqual(clip['start']['utteranceId'], stop['game']['introIds'][-1])
                self.assertEqual(clip['start']['edge'], 'end')
                self.assertEqual(clip['end'], clip['start'], 'Waiting is state-owned, not a fixed-duration bank of reactions')

    def test_inline_picture_is_anchored_after_the_actual_setup_words(self):
        clips = [c for c in self.project['clips'] if c['start'].get('utteranceId') == 'ROOM-III.КАТАСТРОФА' and c['kind'] == 'frame']
        self.assertEqual(len(clips), 1)
        self.assertEqual(clips[0]['start']['type'], 'word')
        self.assertEqual(clips[0]['start']['wordIndex'], len('Мои датчики в серверном трюме зафиксировали'.split()))
        for clip in self.project['clips']:
            for field in ('start', 'end'):
                ref = clip.get(field, {})
                if ref.get('type') == 'word':
                    self.assertLess(ref['wordIndex'], len(self.by_id[ref['utteranceId']]['text'].split()))

    def test_nonspoken_directives_and_game_context_are_not_faked(self):
        scenes = {s['id']: s for s in self.project['scenes']}
        self.assertEqual(scenes['DIRECTIVES']['utteranceIds'], [])
        directives = [c for c in self.project['clips'] if c['sceneId'] == 'DIRECTIVES' and c['kind'] == 'screen']
        self.assertEqual(len(directives), 2)
        self.assertIn('К пятнице 09.10', directives[0]['text'])
        for stop in self.project['stops']:
            context = stop['game'].get('contextAssetId')
            if context:
                asset = next(a for a in self.project['assets'] if a['id'] == context)
                self.assertTrue((module.ROOT / asset['path']).is_file())
                manifest_path = module.ROOT / 'media/interactive/chronicles/context-assets.json'
                context_manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
                approved = context_manifest['games'][stop['game']['id']]
                self.assertEqual(asset['path'], approved['path'])
                self.assertFalse(approved.get('pending'))
                self.assertIn('media/visual/generated/Gui/interactive-context/', asset['path'])
                context_clip = next(c for c in self.project['clips'] if c['id'] == 'context.' + stop['game']['id'])
                self.assertEqual(context_clip['assetId'], context)
                if stop['game']['id'] == 'I-03':
                    self.assertEqual(context_clip['start']['type'], 'word')
                    self.assertEqual(context_clip['start']['utteranceId'], 'I-03.КОНТЕКСТ')
                else:
                    self.assertEqual(context_clip['start']['edge'], 'end')

    def test_word_zero_is_a_word_anchor(self):
        self.assertEqual(module.point('I-03.КОНТЕКСТ', 0)['type'], 'word')
        self.assertEqual(module.point('I-03.КОНТЕКСТ', 0)['wordIndex'], 0)

    def test_import_is_deterministic(self):
        first = self.importer.markdown(self.project)
        again = module.Importer(module.SOURCE.read_text(encoding='utf-8-sig'))
        project, _ = again.build()
        self.assertEqual(first, again.markdown(project))

    def test_completed_song_is_an_optional_extra_not_new_tts(self):
        self.assertEqual(self.project['extras'], [{'kind': 'scene', 'sceneId': 'SONG'}])
        self.assertNotIn({'kind': 'scene', 'sceneId': 'SONG'}, self.project['sequence'])
        song = next(s for s in self.project['scenes'] if s['id'] == 'SONG')
        self.assertEqual(song['utteranceIds'], [])
        self.assertEqual(song['duration'], 237.2)
        self.assertTrue(any(c['id'] == 'song.audio' for c in self.project['clips']))

    def test_original_opening_is_preserved_before_narration_without_new_tts(self):
        self.assertEqual(self.project['sequence'][0], {'kind':'scene','sceneId':'OPENING'})
        opening=next(s for s in self.project['scenes'] if s['id']=='OPENING')
        self.assertEqual(opening['utteranceIds'],[])
        self.assertIn('не отражает точку зрения компании',opening['opening']['disclaimerText'])
        self.assertEqual(opening['opening']['skullLogoKey'],'playbox_skull_logo')
        self.assertEqual(opening['duration'],45.5)


if __name__ == '__main__':
    unittest.main()
