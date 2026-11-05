#!/usr/bin/env bash
# Serve the static site locally: tools/serve.sh [port]
cd "$(dirname "$0")/.." && exec python3 -m http.server "${1:-8000}"
