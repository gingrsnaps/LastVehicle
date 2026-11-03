#!/bin/sh
# Run with: sh START_MAC_LINUX.sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
    exec python3 START_GAME.py
elif command -v node >/dev/null 2>&1; then
    exec node tools/serve.mjs --open
else
    printf '%s\n' 'Install Python 3 or Node.js, then run this launcher again.'
    exit 1
fi
