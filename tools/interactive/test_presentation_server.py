"""HTTP integration checks for the local movie server's media seeking."""
import http.client
import importlib.util
import tempfile
import threading
import unittest
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('presentation_server', Path(__file__).with_name('serve_presentation.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class QuietHandler(module.PresentationHandler):
    def log_message(self, *args):
        pass


class MediaSeekingTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(dir=ROOT / 'scratch')
        assert Path(cls.temp.name).resolve().is_relative_to((ROOT / 'scratch').resolve())
        cls.audio = bytes(range(256)) * 1024
        (Path(cls.temp.name) / 'clip.mp3').write_bytes(cls.audio)
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=cls.temp.name))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        assert Path(cls.temp.name).resolve().is_relative_to((ROOT / 'scratch').resolve())
        cls.temp.cleanup()

    def request(self, method='GET', byte_range=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        connection.request(method, '/clip.mp3', headers={'Range': byte_range} if byte_range else {})
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return result

    def test_full_file_advertises_seek_support(self):
        status, headers, body = self.request()
        self.assertEqual(status, 200)
        self.assertEqual(headers['Accept-Ranges'], 'bytes')
        self.assertEqual(body, self.audio)

    def test_partial_open_ended_and_suffix_ranges(self):
        for requested, expected in [('bytes=0-31', self.audio[:32]), ('bytes=100-199', self.audio[100:200]),
                                    ('bytes=200000-', self.audio[200000:]), ('bytes=-16', self.audio[-16:])]:
            with self.subTest(requested=requested):
                status, headers, body = self.request(byte_range=requested)
                self.assertEqual(status, 206)
                self.assertEqual(int(headers['Content-Length']), len(expected))
                self.assertEqual(body, expected)
                self.assertTrue(headers['Content-Range'].endswith('/' + str(len(self.audio))))

    def test_head_and_unsatisfiable_range(self):
        status, headers, body = self.request('HEAD', 'bytes=32-63')
        self.assertEqual((status, headers['Content-Length'], body), (206, '32', b''))
        status, headers, body = self.request(byte_range='bytes=9999999-')
        self.assertEqual((status, body), (416, b''))
        self.assertEqual(headers['Content-Range'], 'bytes */' + str(len(self.audio)))


if __name__ == '__main__':
    unittest.main()
