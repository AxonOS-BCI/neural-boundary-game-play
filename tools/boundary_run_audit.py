#!/usr/bin/env python3
from pathlib import Path
import sys
root = Path(__file__).resolve().parents[1]
errors=[]
required=["index.html","app.js","styles.css","README.md","VERSION","LICENSE","CRYPTO_PAYMENT_TERMS.md"]
for name in required:
    if not (root/name).exists(): errors.append(f"missing {name}")
ship_files=[root/"index.html", root/"app.js", root/"styles.css", root/"README.md", root/"VERSION", root/"LICENSE", root/"CRYPTO_PAYMENT_TERMS.md", root/"PRIVACY_NOTICE.md", root/"TERMS_OF_USE.md", root/"SECURITY.md"]
all_text="\n".join(p.read_text(errors="ignore") for p in ship_files if p.exists())
for bad in ["v7.9.812","v8.0.1","v7.3.0","ABI v3","unstick-ui","serviceWorker.register","google-analytics","gtag(","mixpanel","amplitude"]:
    if bad in all_text: errors.append(f"forbidden marker in shipped surface: {bad}")
if "DMwHAhqVNWf7dyEznukxCufNS5rjuP5MTp" not in all_text: errors.append("missing Dogecoin donation address")
if "Not a medical device" not in all_text: errors.append("missing medical disclaimer")
if "RUN GAME" not in (root/"README.md").read_text(errors="ignore"): errors.append("README lacks RUN GAME")
if (root/"VERSION").read_text().strip() != "8.8.4": errors.append("VERSION mismatch")
if errors:
    print("AUDIT FAIL")
    for e in errors: print("-", e)
    sys.exit(1)
print("AUDIT OK: Boundary Run v8.8.4")
