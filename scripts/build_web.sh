#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
DIST="${1:-dist}"
rm -rf "$DIST"
mkdir -p "$DIST"
cp web/index.html "$DIST/index.html"
cp web/main.js "$DIST/main.js"
cp web/styles.css "$DIST/styles.css"
if [ -d web/assets ]; then
  mkdir -p "$DIST/assets"
  cp -R web/assets/. "$DIST/assets/"
fi
touch "$DIST/.nojekyll"
test -s "$DIST/index.html"
test -s "$DIST/main.js"
test -s "$DIST/styles.css"
node --check "$DIST/main.js"
python3 tools/boundary_run_audit.py "$DIST"
node qa/boundary-run-static-smoke.mjs
echo "OK: Boundary Run v8.8.3 full clean browser artifact built in $DIST"
