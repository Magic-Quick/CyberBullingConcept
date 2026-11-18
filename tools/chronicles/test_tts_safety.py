import unittest
from generate_voice import spoken_text

class SpokenTextTests(unittest.TestCase):
    def test_screen_emoticon_never_reaches_speech_generation(self):
        authored='«Визуал брать не стоит :)»,'
        self.assertNotIn(':)',spoken_text(authored))
        self.assertIn('Визуал брать не стоит',spoken_text(authored))

    def test_dialogue_punctuation_and_technical_times_are_preserved(self):
        text='Лорд: (пауза), 12:30; протокол 3:1.'
        self.assertEqual(spoken_text(text),text)
