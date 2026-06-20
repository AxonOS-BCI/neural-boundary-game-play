# Security and Privacy Notes

Boundary Run v8.8.3 is a static browser educational game.

It must not collect real neural data, biometric data, microphone data, camera data, wallet data, account data, or analytics events.

Forbidden runtime behavior:

- telemetry;
- analytics;
- remote script loading;
- service worker registration;
- external network calls during gameplay;
- real BCI hardware access;
- medical claims.

Allowed runtime behavior:

- local static rendering;
- local keyboard/touch input;
- local replay proof generation;
- local clipboard copy when explicitly requested by the player.
