"""Serve the repository locally with byte ranges required for media seeking."""
import functools
import http.server
import re
import sys
from pathlib import Path


class MediaHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        self.remaining = None
        path = Path(self.translate_path(self.path))
        requested = self.headers.get('Range')
        if not requested or not path.is_file():
            return super().send_head()
        size = path.stat().st_size
        match = re.fullmatch(r'bytes=(\d+)-(\d*)', requested)
        start = int(match[1]) if match else size
        end = min(int(match[2]), size - 1) if match and match[2] else size - 1
        if start > end:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None
        source = path.open('rb')
        source.seek(start)
        self.remaining = end - start + 1
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(self.remaining))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        return source

    def copyfile(self, source, output):
        if self.remaining is None:
            return super().copyfile(source, output)
        while self.remaining:
            data = source.read(min(65536, self.remaining))
            if not data:
                break
            output.write(data)
            self.remaining -= len(data)


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[2]
    handler = functools.partial(MediaHandler, directory=str(root))
    port = int(sys.argv[1]) if len(sys.argv)>1 else 4180
    http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
