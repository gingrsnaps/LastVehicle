#!/usr/bin/env python3
"""Serve the bundled browser game locally with Python's standard library.

No pip install or internet is needed. Keep this console open while playing.
A fixed origin keeps browser saves in the same place between launches.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent / "dist"
HOST, PORT = "127.0.0.1", 8080
URL = f"http://{HOST}:{PORT}/"


class GameFiles(SimpleHTTPRequestHandler):
    # Explicit MIME types avoid platform-specific .js/.glb associations.
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".glb": "model/gltf-binary",
        ".ogg": "audio/ogg",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, message, *args):
        # Routine asset loads are quiet; errors still give useful feedback.
        if args and str(args[1] if len(args) > 1 else "") not in ("200", "304"):
            super().log_message(message, *args)


def main():
    if not (ROOT / "index.html").is_file():
        print("Extract the entire ZIP first. The dist/index.html file is missing.")
        return 1
    try:
        server = ThreadingHTTPServer((HOST, PORT), partial(GameFiles, directory=str(ROOT)))
    except OSError as error:
        print(f"Could not start {URL}: {error}")
        print("Close an earlier Last Vehicle server, or use its existing browser tab.")
        print("No other program was stopped. Keep the same address to retain local saves.")
        return 1
    print(f"Last Vehicle — A GingrSnaps Project\n{URL}")
    print("Keep this window open. Press Ctrl+C to stop. Opening your browser…")
    # Binding succeeded before opening the browser. Requests can queue while the
    # main thread enters serve_forever, so there is no startup-page race.
    threading.Timer(0.3, lambda: webbrowser.open(URL)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nGarage closed. Your completed checkpoints stay in this browser.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
