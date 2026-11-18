"""Production gates must reject plausible but stale or broken authoring data."""
import copy
import importlib.util
import json
from pathlib import Path
import re
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('chronicles_validator', HERE / 'validate_project.py')
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)


class ProductionValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.markdown = validator.PROJECT.read_text(encoding='utf-8-sig')
        cls.config = json.loads(re.search(r'```chronicles-config\n([\s\S]*?)\n```', cls.markdown)[1])

    def validate_changed(self, change):
        config = copy.deepcopy(self.config)
        change(config)
        text = re.sub(r'(```chronicles-config\n)[\s\S]*?(\n```)', lambda m: m[1] + json.dumps(config, ensure_ascii=False) + m[2], self.markdown)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'project.md'
            path.write_text(text, encoding='utf-8')
            return validator.validate(path)

    def test_complete_authored_project_is_production_ready(self):
        info, pending = validator.validate()
        self.assertEqual(info['errors'], [])
        self.assertEqual(pending, [])
        self.assertEqual(info['utteranceCount'], 242)

    def test_stale_voice_and_missing_alignment_block_production(self):
        def change(config):
            config['utterances'][0]['audioTextHash'] = '0' * 64
            config['utterances'][0]['words'] = []
        info, pending = self.validate_changed(change)
        self.assertEqual(info['status'], 'draft')
        self.assertTrue(any('stale voice' in problem for problem in pending))
        self.assertTrue(any('missing word alignment' in problem for problem in pending))

    def test_invalid_real_word_timing_is_not_accepted_as_ready(self):
        def change(config):
            config['utterances'][0]['words'][0]['end'] = config['utterances'][0]['duration'] + 5
        info, _ = self.validate_changed(change)
        self.assertTrue(any('Invalid word interval' in error for error in info['errors']))

    def test_reversed_montage_and_unsafe_base_gain_are_rejected(self):
        def change(config):
            clip = config['clips'][0]
            clip['start'] = {'type': 'scene', 'offset': 5}
            clip['end'] = {'type': 'scene', 'offset': 1}
            clip['duckBaseTo'] = 2
        info, _ = self.validate_changed(change)
        self.assertTrue(any('Invalid clip interval' in error for error in info['errors']))
        self.assertTrue(any('Invalid duckBaseTo' in error for error in info['errors']))


if __name__ == '__main__':
    unittest.main()
