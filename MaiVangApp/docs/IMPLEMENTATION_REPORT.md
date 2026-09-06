# Implementation report

Final integration pass: 2026-09-05. Frontend branch: `feat/maicare-final-production`.

## Production integration fixes

- Changed native/default API bases from localhost to both deployed HTTPS services.
- Kept a web-only development bridge because deployed CORS does not authorize localhost; mobile never depends on it.
- Routed all text and image interactions through authenticated Django history so the server remains the message source of truth.
- Preserved exact multipart field `image`, optional `question`, browser filename/MIME/bytes, and native URI/name/type. Empty image-only text is omitted.
- Added `detections[].name` normalization; the former boundary mapping silently discarded the real deployed label.
- Added long AI timeout, bounded auth timeout, one shared concurrent refresh, and no automatic POST retry. A transient refresh network failure no longer destroys a recoverable session.
- Ensured a newly created history session is also removed when an upstream 2xx response is malformed or has an empty answer, not only when the HTTP request fails.
- Added versioned, user-scoped, idempotent local persistence only for image data Django does not store. Native files are copied under app documents; web Blobs use IndexedDB. Server messages are not duplicated.
- Added an in-app native camera with permission recovery, framing guide, explicit capture, review, retake, and use controls.
- Fixed history ordering to `updated_at`, reliable locally stored image kind, exact loading/empty/error copy, complete image detail, and object-URL cleanup.
- Removed the duplicate bridge health handler and added a deployed-service web startup workflow.

## Nielsen Norman heuristic audit

1. **Visibility:** distinct auth, font, history load/refresh, image/text processing, send, and deletion busy states; submit buttons are guarded against double use.
2. **Real-world match:** Vietnamese product language describes leaf checks, care guidance, camera/library, and recovery actions without implementation terms.
3. **Control:** back, cancel, replace, remove, retake, library fallback, tutorial skip/back, retry, logout, and confirmed deletion are available.
4. **Consistency:** shared green/ivory tokens, Roboto 400/500/700, 44–52 px controls, radii, spacing, and error surfaces are reused.
5. **Prevention:** blank submission is disabled, fields are validated, multipart text is omitted when blank, active sends cannot be duplicated, and account deletion is confirmed.
6. **Recognition:** inputs have persistent labels; icons have accessible button labels; all primary actions are visible.
7. **Efficiency:** image-only, image+text, and text-only start from the same diagnosis-first screen; follow-up stays in its conversation.
8. **Minimalism:** exactly three tabs remain, copy is not duplicated, chat is secondary, and raw transport data is never rendered.
9. **Recovery:** natural messages distinguish connectivity, timeout, invalid image, session expiry, and temporary processing failure; camera/library permissions offer retry/settings/fallback.
10. **Help:** the responsive six-step first-run tutorial persists by version and can be replayed from Account.

## Platform review

- iOS: SafeAreaProvider/SafeAreaView, keyboard avoidance, SecureStore, camera/photo permission copy, contained images, bottom-tab inset handling from React Navigation, and local font assets are present.
- Android: system back is handled by navigation/modals, camera uses the current Expo permission module, picker avoids unnecessary storage permissions, `content://` is sent as a native FormData URI, SecureStore and small-screen scroll paths are present.
- Web: 460 px centered mobile shell, hidden system file chooser behind the source sheet, Blob multipart, browser camera fallback, keyboard navigation, IndexedDB image persistence, and Edge E2E coverage.

## Backend limitations

The deployed backend saves a user message before it calls the downstream assistant. A failed follow-up can remain as an unmatched user message. There is no public message-delete endpoint; frontend rollback is possible only when it created the whole session for that first attempt. Image bytes and detections are not stored server-side, which is why the scoped local fallback exists.

During the final recovery run, one direct same-session follow-up returned 500 after saving the user message, and isolated direct image probes returned 500/503 while the downstream detector was transiently unavailable. The later full Edge flow succeeded for text, follow-up, image-only, and image-plus-text without changing the frontend contract.

No backend repository was edited.

## Dependency security review

`npm audit --omit=dev` reports 17 moderate transitive advisories in the current Expo/React Navigation toolchain. npm offers no compatible automatic remediation (several suggestions are breaking downgrades or major-version changes). This pass deliberately did not run `npm audit fix --force`; dependency migration requires separately scoped native-device regression testing. No production API secret is present in the frontend deliverables.

## Final validation

- Deployed Django schema and chat-service root: HTTP 200.
- Disposable API matrix: registration/login/me/refresh/logout/delete, validation failures, text, same-session follow-up, image-only, image+text, history persistence, and cross-account isolation verified.
- Microsoft Edge 152 E2E: PASS against deployed services through the development bridge, including both image modes, same-session follow-up, history after reload/relogin, Markdown assertions, tutorial, and all eight target viewports.
- TypeScript: PASS; unit tests: 15/15; Expo doctor: 21/21; dependency tree and diff whitespace: PASS.
- Final Expo export bundled web (603 modules), iOS (927 modules), and Android (922 modules), including local Roboto 400/500/700 assets.
- Local Android `assembleRelease`: PASS. `dist/MaiCare-final.apk` is a verified arm64-v8a internal-test APK signed with a debug certificate; obsolete storage, audio, and overlay permissions are absent.
