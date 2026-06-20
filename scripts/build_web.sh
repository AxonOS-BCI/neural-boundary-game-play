#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
DIST="${1:-dist}"
rm -rf "$DIST"
mkdir -p "$DIST"
cp index.html app.js styles.css README.md VERSION LICENSE "$DIST"/
mkdir -p "$DIST/LICENSES"
cp -r LICENSES/* "$DIST/LICENSES"/
node --check app.js
python3 tools/boundary_run_audit.py
test -s "$DIST/index.html"
test -s "$DIST/app.js"
node --check "$DIST/app.js"
grep -q "RUN GAME" "$DIST/index.html"
grep -q "Ari" "$DIST/index.html"
! grep -R "unstick-ui\|serviceWorker.register\|v7.9.812\|v8.0.1\|v7.3.0\|ABI v3" "$DIST"
echo "OK: Boundary Run static browser release built into $DIST"
