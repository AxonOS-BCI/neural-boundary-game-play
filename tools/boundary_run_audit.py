#!/usr/bin/env python3
"""Static release audit for Boundary Run browser artifacts."""
from pathlib import Path
import re
import sys

CURRENT = "8.8.3"
root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("dist")
required = ["index.html", "main.js", "styles.css"]
missing = [name for name in required if not (root / name).is_file()]
if missing:
    raise SystemExit(f"FAIL: missing artifact files: {missing}")
text = "\n".join((root / name).read_text(errors="ignore") for name in required)
needles = [
    "Boundary Run",
    "The Little Signal",
    "Ari",
    "Kibo",
    "Proof Shard",
    "Replay Proof",
    "Not a medical device",
    "No real neural data",
    CURRENT,
]
for needle in needles:
    if needle not in text:
        raise SystemExit(f"FAIL: missing required marker: {needle}")
old_versions = [
    "v" + "7" + "." + "9" + "." + "812",
    "v" + "8" + "." + "0" + "." + "1",
    "v" + "8" + "." + "3" + "." + "0",
    "v" + "8" + "." + "3" + "." + "1",
    "v" + "8" + "." + "3" + "." + "2",
    "v" + "7" + "." + "3" + "." + "0",
    "ABI" + " v" + "3",
]
for marker in old_versions:
    if marker in text:
        raise SystemExit(f"FAIL: stale marker found: {marker}")
for pat in [
    r"gtag",
    r"google-analytics",
    r"serviceWorker\.register",
    r"XMLHttpRequest",
    r"https?://",
    r"eval\s*\(",
    r"localStorage\.setItem\([^)]*(proof|input|telemetry)",
]:
    if re.search(pat, text, re.I):
        raise SystemExit(f"FAIL: forbidden marker matched: {pat}")
for pat in [
    r"Raw Signal Leak",
    r"Seal Vault",
    r"Ari Trust",
    r"Consent Coherence",
    r"DeterministicHash",
    r"recommendedAction",
]:
    if not re.search(pat, text):
        raise SystemExit(f"FAIL: gameplay marker missing: {pat}")
if re.search(r"\bcoin(s)?\b", text, re.I):
    raise SystemExit("FAIL: ordinary coin language found; use Proof Shards/resources")
print("OK: Boundary Run static audit passed")
