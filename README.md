# AxonOS Education — Boundary Run v8.8.3

**Boundary Run: The Little Signal** is a browser educational game about cognitive privacy, consent, safe intent, and deterministic replay proof.

Guide **Ari**, a small safe-intent courier, through a neural boundary field. Kibo, a loyal guardian companion, warns Ari about raw signal leaks, stale consent, unauthorized apps, artifact spikes, unsafe stimulation, and memory phishing.

Core line:

> Ari is not carrying a thought. Ari is carrying a choice. Protect the choice. Protect the person.

## What is included

- Full clean browser release, no patch overlay required.
- Static HTML/CSS/JavaScript game.
- Three-lane runner mechanics.
- Emotional characters: Ari and Kibo.
- AxonOS actions: Audit, Revoke, Throttle, Seal Vault, Quarantine.
- Proof Shards, Consent Tokens, Vault Keys.
- Replay proof and deterministic state hash.
- Mobile controls and keyboard controls.
- Static QA/audit gates.
- GitHub Actions CI and Pages workflow.

## Status

Educational simulation only.  
Not a medical device.  
No real neural data is collected.  
No telemetry.  
No analytics.  
No backend.  
No service worker.

## Run locally

```bash
bash scripts/build_web.sh dist
python3 -m http.server 8080 -d dist
```

Open:

```text
http://127.0.0.1:8080
```

## Deploy

This repository is GitHub Pages ready. The workflow builds `dist/` and deploys the static artifact.

## License

The project preserves the AxonOS dual-license posture:

```text
AGPL-3.0-only OR LicenseRef-AxonOS-Commercial
```

See `LICENSE`, `LICENSES/`, and `COMMERCIAL_LICENSE.md` where applicable.
