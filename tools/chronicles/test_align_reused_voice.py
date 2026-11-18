"""Check that alignment never fills gaps with manufactured speech timestamps."""
import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('align_reused_voice', Path(__file__).with_name('align_reused_voice.py'))
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class ReusedAlignmentTests(unittest.TestCase):
    def test_partial_asr_keeps_only_observed_words(self):
        matches, coverage = module.match_heard(['Есть', 'такая', 'буква.'], [
            {'word': ' Есть', 'start': .2, 'end': .5}, {'word': ' буква.', 'start': 1.1, 'end': 1.5}])
        self.assertEqual(set(matches), {0, 2})
        self.assertAlmostEqual(coverage, 2 / 3)
        self.assertEqual(matches[2]['start'], 1.1)

    def test_author_punctuation_uses_real_aligned_word_intervals(self):
        words, reasons = module.authored_word_times(['Есть', 'такая', 'буква…'], [
            {'word': ' Есть', 'start': .1, 'end': .4},
            {'word': ' такая', 'start': .5, 'end': .9},
            {'word': ' буква...', 'start': 1.2, 'end': 1.8},
        ], 2.0)
        self.assertEqual(reasons, [])
        self.assertEqual(words[-1], {'text': 'буква…', 'start': 1.2, 'end': 1.8})

    def test_missing_or_different_tokens_are_not_force_mapped(self):
        words, reasons = module.authored_word_times(['Есть', 'такая', 'буква.'], [
            {'word': ' Есть', 'start': .1, 'end': .4}, {'word': ' буква', 'start': 1.2, 'end': 1.8},
        ], 2.0)
        self.assertIsNone(words)
        self.assertEqual(reasons, ['forced_text_mismatch'])

    def test_collapsed_word_is_rejected_not_interpolated(self):
        words, reasons = module.authored_word_times(['Есть', 'буква.'], [
            {'word': ' Есть', 'start': .1, 'end': .1}, {'word': ' буква', 'start': 1.2, 'end': 1.8},
        ], 2.0)
        self.assertIsNone(words)
        self.assertIn('collapsed_word_boundary', reasons)

    def test_own_ellipsis_forms_have_identical_lexical_keys(self):
        self.assertEqual(module.normalize('буква…'), module.normalize('буква...'))
        self.assertEqual(module.normalize('её'), module.normalize('ее'))


if __name__ == '__main__':
    unittest.main()
