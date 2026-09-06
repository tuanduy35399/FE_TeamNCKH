# Acceptance tests

Run date: 2026-09-05. Production smoke tests used generated disposable accounts and a real project JPEG. Both accounts from the completed smoke suite were deleted.

## Direct deployed API evidence

- Register 201; login 200; me 200; refresh 200; logout 200; account deletion 204.
- Chat-service root 200 and text chat 200 with a nonempty answer.
- Django text turn 200 in one created history session.
- Direct follow-up probes have demonstrated the deployed transactional limitation: an upstream failure can return 500/503 after the user message is saved. The final Edge flow completed its same-session follow-up successfully.
- Image-only 200 with nonempty answer and one detection.
- Image+Vietnamese-text 200.
- History list/detail 200; returned session ID matched; messages were ordered.
- Second account list did not contain the first account’s history.

## Automated suites

| Check | Result |
|---|---|
| `npm run check` | PASS |
| `npm test` | PASS — 15/15 |
| `npm run doctor` | PASS — 21/21 |
| `npm run export:web` | PASS |
| final combined web/iOS/Android export | PASS — all three bundles |
| `npm run test:e2e` | PASS — installed Edge, 1/1 |
| `npm ls --depth=0` | PASS |
| `git diff --check` | PASS |
| local Android `assembleRelease` | PASS — verified arm64-v8a APK |
| APK signature/manifest | PASS — v2 signature; no obsolete storage, audio, or overlay permission |
| `npm audit --omit=dev` | REVIEW — 17 moderate transitive advisories; no compatible automatic fix |

## Covered matrices

- Auth: registration validation, login, profile restore, concurrent refresh path, logout, protected routes, confirmed deletion.
- Diagnosis: JPEG/PNG multipart unit paths, image-only omission, image+text preservation, invalid image mapping, failed-first-session cleanup, duplicate-submit guard.
- Malformed 2xx diagnosis responses are treated as failures and remove a newly created session.
- Chat: Vietnamese text, follow-up reuse, blank guard, long scrollable answer, timeout/network recovery.
- History: empty/list/detail, one session per conversation, follow-up reuse, same-title distinct IDs, ID deduplication, reload/relogin persistence, newest-first ordering, cross-user isolation, local image fallback.
- Tutorial: first run, next/back/skip/completion, persistence, replay, target measurement, small viewport.
- Responsive Edge: 375×667, 390×844, 430×932, 360×640, 360×800, 412×915, 1280×800, and 1440×900.

Unsupported/corrupt/oversize behavior is handled, but the service publishes no type allowlist or size limit, so no fabricated boundary value is asserted.

The first final Edge attempt correctly surfaced two deployed Django chat 503 responses and rolled back each newly created empty session. A direct non-persistent chat-service probe then returned 200, and the single bounded E2E retry passed all steps.

Physical iPhone and Android execution is READY, not PASS: this Windows host has no iOS runtime or connected/authorized Android target. Android SDK/emulator tooling exists, but ADB exposed no controllable device in the final run. Platform configuration, permissions, static review, JavaScript/asset exports, and the APK build passed.
