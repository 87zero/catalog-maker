#!/bin/sh
# Rebuild a customer's catalog from the given source directory (default: cwd)
# and preview it on an available loopback port.
set -eu
engine_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
source_dir=$(CDPATH= cd -- "${1:-.}" && pwd)
node "$engine_dir/build.mjs" --source "$source_dir"
exec python3 - "$source_dir/public" <<'PY'
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import sys

handler = partial(SimpleHTTPRequestHandler, directory=sys.argv[1])
with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
    print(f"Preview: http://127.0.0.1:{server.server_port}/", flush=True)
    print("Press Ctrl+C to stop. Rebuild after editing catalog folders, then refresh.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
PY
