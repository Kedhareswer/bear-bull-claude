import os
import http.server
import socketserver

PORT = int(os.environ.get("PORT", 3333))
DIRECTORY = os.path.join(os.path.dirname(__file__), "prototype")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass  # suppress access logs

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving on port {PORT}", flush=True)
    httpd.serve_forever()
