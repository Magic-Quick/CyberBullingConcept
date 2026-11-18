"""Speech synchronisation must not rebuild or destroy a director's montage."""
import copy
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('chronicles_sync_voice', Path(__file__).with_name('sync_voice.py'))
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class VoiceSyncTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='voice-sync-test-', dir=ROOT / 'scratch')
        self.root = Path(self.temp.name)
        (self.root / 'old.mp3').write_bytes(b'existing recording')
        (self.root / 'new.mp3').write_bytes(b'new recording')
        self.bodies = {'u1': 'Старая речь.', 'u2': 'Вторая речь.'}
        self.config = {
            'schemaVersion': 1, 'id': 'edited-project', 'title': 'Ручной монтаж',
            'tracks': [{'id': 'A1', 'kind': 'voice', 'label': 'Авторский голос', 'order': 2}],
            'assets': [{'id': 'old', 'kind': 'audio', 'path': 'old.mp3', 'duration': 10,
                        'sha256': sync.sha(b'existing recording'), 'customLabel': 'Сохранить'}],
            'utterances': [{'id': uid, 'textHash': sync.sha(text), 'audioTextHash': sync.sha(text),
                            'audioAssetId': 'old', 'duration': 10,
                            'words': [{'text': word, 'start': i, 'end': i + .5} for i, word in enumerate(text.split())]}
                           for uid, text in self.bodies.items()],
            'scenes': [{'id': 'ROOM-I', 'title': 'Ручное название', 'kind': 'room', 'utteranceIds': ['u1', 'u2'], 'duration': 30},
                       {'id': 'ROOM-II', 'title': 'Другой зал', 'kind': 'room', 'utteranceIds': [], 'duration': 5}],
            'clips': [
                {'id': 'voice.u1', 'sceneId': 'ROOM-I', 'trackId': 'A1', 'kind': 'voice', 'utteranceId': 'u1',
                 'assetId': 'old', 'start': {'type': 'scene', 'offset': 0}, 'duration': 10, 'gain': .73, 'fadeIn': .4},
                {'id': 'voice.u2', 'sceneId': 'ROOM-I', 'trackId': 'A1', 'kind': 'voice', 'utteranceId': 'u2',
                 'assetId': 'old', 'start': {'type': 'scene', 'offset': 12}, 'duration': 10},
                {'id': 'manual-overlay', 'sceneId': 'ROOM-I', 'trackId': 'V2', 'kind': 'image', 'assetId': 'custom',
                 'start': {'type': 'scene', 'offset': 14}, 'end': {'type': 'scene', 'offset': 24},
                 'transform': {'x': .813, 'width': .42}, 'fadeOut': .65, 'customNote': 'Не пересоздавать'},
                {'id': 'anchored-overlay', 'sceneId': 'ROOM-I', 'trackId': 'V2', 'kind': 'image',
                 'start': {'type': 'word', 'utteranceId': 'u1', 'wordIndex': 1, 'offset': .2}, 'duration': 2},
                {'id': 'other-scene', 'sceneId': 'ROOM-II', 'trackId': 'V2', 'kind': 'image',
                 'start': {'type': 'scene', 'offset': 1}, 'duration': 3},
            ],
            'stops': [{'id': 'STOP', 'customRules': {'preserve': True}}],
            'sequence': [{'kind': 'scene', 'sceneId': 'ROOM-I'}, {'kind': 'stop', 'stopId': 'STOP'}],
            'extras': [{'kind': 'scene', 'sceneId': 'ROOM-II'}], 'authorNote': 'Прочие свойства сохранять',
        }
        self.master = self.root / 'master.md'
        self.master.write_text(self.document(self.config, self.bodies), encoding='utf-8')

    def tearDown(self):
        assert self.root.resolve().is_relative_to((ROOT / 'scratch').resolve())
        self.temp.cleanup()

    def document(self, config, bodies):
        return ('# Источник\n\n<!-- Авторская заметка $& -->\n\n'
                + '\n'.join(f'[ГОЛОС ЛОРДА {uid}]\n{text}\n[КОНЕЦ РЕПЛИКИ]\n' for uid, text in bodies.items())
                + '\nНеозвучиваемая **заметка**.\n\n```chronicles-config\n'
                + json.dumps(config, ensure_ascii=False, indent=2) + '\n```\n\nКонец.\n')

    def cache(self, text='Новая речь.', duration=15, uid='u1'):
        return {'clips': {uid: {'text': text, 'text_sha256': sync.sha(text), 'file': 'new.mp3', 'duration': duration,
                               'voice_id': sync.VOICE_ID, 'model_id': sync.MODEL_ID,
                               'audio_sha256': sync.sha(b'new recording'),
                               'words': [{'text': word, 'start': i, 'end': i + .5} for i, word in enumerate(text.split())]}}}

    def test_manifest_contains_only_stale_or_missing_current_speech(self):
        current = {**self.bodies, 'u1': 'Новая речь.'}
        manifest, report = sync.make_manifest('text', self.config, current, {}, self.root)
        self.assertEqual([row['id'] for row in manifest['utterances']], ['u1'])
        self.assertEqual(manifest['utterances'][0]['text'], 'Новая речь.')
        self.assertEqual(manifest['utterances'][0]['status'], 'stale')
        self.assertIsNone(manifest['utterances'][0]['file'])  # Old existing MP3 must not skip generation.
        self.assertEqual(report['readyUnchanged'], 1)
        self.assertEqual(report['needsGeneration'], ['u1'])

    def test_manifest_can_reuse_matching_hash_from_another_semantic_id(self):
        bodies = {**self.bodies, 'u1': 'Новая речь.'}
        manifest, report = sync.make_manifest('text', self.config, bodies, self.cache(uid='other-id'), self.root)
        self.assertEqual(manifest['utterances'][0]['file'], 'new.mp3')
        self.assertEqual(report['needsGeneration'], [])
        self.assertEqual(report['matchingCacheAvailable'], ['u1'])

    def test_apply_preserves_all_manual_montage_and_reports_a_new_overlap_without_ripple(self):
        bodies = {**self.bodies, 'u1': 'Новая речь.'}
        before = copy.deepcopy(self.config)
        result, report = sync.apply_cache(self.config, bodies, self.cache(), self.root)
        for field in ('tracks', 'stops', 'sequence', 'extras', 'scenes', 'authorNote'):
            self.assertEqual(result[field], before[field])
        self.assertEqual(result['clips'][1:], before['clips'][1:])
        self.assertEqual(result['clips'][0]['duration'], 15)
        self.assertEqual(result['clips'][0]['gain'], .73)
        self.assertEqual(result['clips'][0]['fadeIn'], .4)
        self.assertEqual(result['utterances'][0]['audioTextHash'], sync.sha(bodies['u1']))
        self.assertEqual(self.config, before)
        overlap = next(d for d in report['diagnostics'] if d['code'] == 'voice_overlap')
        self.assertEqual(overlap['overlapSeconds'], 3)
        self.assertTrue(any(d['code'] == 'word_anchor_review' for d in report['diagnostics']))

    def test_explicit_ripple_moves_later_fixed_references_and_preserves_relative_anchors(self):
        result, report = sync.apply_cache(self.config, {**self.bodies, 'u1': 'Новая речь.'}, self.cache(), self.root, ripple=True)
        self.assertEqual(result['clips'][1]['start']['offset'], 17)
        self.assertEqual(result['clips'][2]['start']['offset'], 19)
        self.assertEqual(result['clips'][2]['end']['offset'], 29)
        self.assertEqual(result['clips'][2]['transform'], self.config['clips'][2]['transform'])
        self.assertEqual(result['clips'][3], self.config['clips'][3])
        self.assertEqual(result['clips'][4], self.config['clips'][4])
        self.assertEqual(result['scenes'][0]['duration'], 35)
        self.assertEqual(result['scenes'][1], self.config['scenes'][1])
        self.assertFalse(any(d['code'] == 'voice_overlap' for d in report['diagnostics']))

    def test_existing_head_and_tail_trims_are_not_reset(self):
        self.config['clips'][0].update({'sourceIn': 2, 'sourceOut': 7, 'duration': 5})
        result, report = sync.apply_cache(self.config, {**self.bodies, 'u1': 'Новая речь.'}, self.cache(), self.root, ripple=True)
        self.assertEqual(result['clips'][0]['sourceIn'], 2)
        self.assertEqual(result['clips'][0]['sourceOut'], 7)
        self.assertEqual(result['clips'][0]['duration'], 5)
        self.assertEqual(report['shiftedReferences'], [])

    def test_multiple_ripple_changes_use_original_boundaries_without_double_shift(self):
        (self.root / 'second.mp3').write_bytes(b'second new recording')
        bodies = {'u1': 'Новая речь.', 'u2': 'И другая речь.'}
        cached = self.cache()
        second = {'text': bodies['u2'], 'text_sha256': sync.sha(bodies['u2']), 'file': 'second.mp3', 'duration': 8,
                  'audio_sha256': sync.sha(b'second new recording'),
                  'words': [{'text': word, 'start': i, 'end': i + .5} for i, word in enumerate(bodies['u2'].split())]}
        cached['clips']['u2'] = second
        self.config['clips'][1]['end'] = {'type': 'scene', 'offset': 22}
        result, report = sync.apply_cache(self.config, bodies, cached, self.root, ripple=True)
        self.assertEqual(result['clips'][1]['start']['offset'], 17)
        self.assertEqual(result['clips'][1]['end']['offset'], 25)
        self.assertEqual(result['clips'][2]['start']['offset'], 19)
        self.assertEqual(result['clips'][2]['end']['offset'], 27)
        self.assertEqual(result['scenes'][0]['duration'], 33)
        self.assertFalse(any(d['code'] == 'voice_overlap' for d in report['diagnostics']))

    def test_invalid_cache_text_audio_hash_or_word_alignment_is_never_applied(self):
        for kind in ('text', 'audio', 'words'):
            with self.subTest(kind=kind):
                cached = self.cache()
                if kind == 'text': cached['clips']['u1']['text_sha256'] = '0' * 64
                if kind == 'audio': cached['clips']['u1']['audio_sha256'] = '0' * 64
                if kind == 'words': cached['clips']['u1']['words'].pop()
                result, report = sync.apply_cache(self.config, {**self.bodies, 'u1': 'Новая речь.'}, cached, self.root)
                self.assertEqual(result, self.config)
                self.assertEqual(report['pending'], ['u1'])

    def test_missing_word_timing_is_recovered_without_generating_another_take(self):
        self.config['utterances'][0]['words'] = []
        self.config['assets'][0].update({'path': 'new.mp3', 'sha256': sync.sha(b'new recording')})
        result, report = sync.apply_cache(self.config, self.bodies, self.cache(text=self.bodies['u1'], duration=10), self.root)
        self.assertEqual(report['updatedUtterances'], ['u1'])
        self.assertEqual([w['text'] for w in result['utterances'][0]['words']], self.bodies['u1'].split())

    def test_a_ready_manual_alternate_take_is_not_replaced_by_cached_default_take(self):
        self.config['utterances'][0]['words'] = []
        result, report = sync.apply_cache(self.config, self.bodies, self.cache(text=self.bodies['u1']), self.root)
        self.assertEqual(result, self.config)
        self.assertEqual(report['pending'], ['u1'])

    def test_noop_cache_application_keeps_document_byte_for_byte(self):
        source = self.master.read_text(encoding='utf-8')
        normalized, config, bodies = sync.parse_document(source)
        result, report = sync.apply_cache(config, bodies, {}, self.root)
        self.assertEqual(sync.render_document(normalized, result, config), source)
        self.assertEqual(report['updatedUtterances'], [])

    def test_changed_config_never_rewrites_speech_or_notes_or_duplicates_text(self):
        source, config, bodies = sync.parse_document(self.master.read_text(encoding='utf-8'))
        bodies['u1'] = 'Новая речь.'
        edited_source = source.replace('Старая речь.', 'Новая речь.', 1)
        result, _ = sync.apply_cache(config, bodies, self.cache(), self.root)
        output = sync.render_document(edited_source, result, config)
        self.assertEqual(sync.CONFIG.sub('<CONFIG>', output), sync.CONFIG.sub('<CONFIG>', edited_source))
        self.assertTrue(all('text' not in u for u in sync.parse_document(output)[1]['utterances']))

    def test_outputs_never_overwrite_input_master_or_write_fin(self):
        before = self.master.read_bytes()
        for target in (self.master, self.root / 'Fin' / 'voice.md', self.root.parent / 'outside.md'):
            with self.subTest(target=target), self.assertRaises(ValueError):
                sync.write_output(target, b'new', self.root, self.master, overwrite=True)
        self.assertEqual(self.master.read_bytes(), before)

    def test_overwriting_a_separate_output_is_explicit_and_keeps_history(self):
        target = self.root / 'next.md'
        target.write_bytes(b'previous output')
        with self.assertRaises(FileExistsError):
            sync.write_output(target, b'new output', self.root, self.master)
        sync.write_output(target, b'new output', self.root, self.master, overwrite=True)
        self.assertEqual(target.read_bytes(), b'new output')
        history = list((self.root / 'scratch/chronicles-voice-sync-history').glob('*'))
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0].read_bytes(), b'previous output')

    def test_transient_windows_replacement_locks_are_retried(self):
        target = self.root / 'next.md'
        original = sync.os.replace
        attempts = []
        def flaky(source, destination):
            attempts.append(1)
            if len(attempts) < 3: raise PermissionError('temporary mapped-file lock')
            return original(source, destination)
        with patch.object(sync.os, 'replace', side_effect=flaky), patch.object(sync.time, 'sleep'):
            sync.write_output(target, b'complete project', self.root, self.master)
        self.assertEqual(len(attempts), 3)
        self.assertEqual(target.read_bytes(), b'complete project')

    def test_concurrent_output_changes_are_preserved_and_prepared_result_survives(self):
        target = self.root / 'next.md'
        target.write_bytes(b'old')
        def concurrent(source, destination):
            target.write_bytes(b'external new edit')
            raise PermissionError('retry after another writer')
        with patch.object(sync.os, 'replace', side_effect=concurrent), patch.object(sync.time, 'sleep'):
            with self.assertRaises(RuntimeError):
                sync.write_output(target, b'prepared version', self.root, self.master, overwrite=True)
        self.assertEqual(target.read_bytes(), b'external new edit')
        temporary = list(self.root.glob('next.md.*.tmp'))
        self.assertEqual(len(temporary), 1)
        self.assertEqual(temporary[0].read_bytes(), b'prepared version')

    def test_manifest_cli_creates_only_the_requested_new_output_and_report(self):
        output = self.root / 'voice-manifest.json'
        cache = self.root / 'cache.json'; cache.write_text('{"clips":{}}', encoding='utf-8')
        before = self.master.read_bytes()
        result = subprocess.run([sys.executable, str(Path(sync.__file__)), '--manifest', '--master', str(self.master),
                                 '--cache', str(cache), '--output', str(output)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.master.read_bytes(), before)
        self.assertTrue(output.is_file())
        self.assertTrue(output.with_name(output.name + '.report.json').is_file())


if __name__ == '__main__':
    unittest.main()
