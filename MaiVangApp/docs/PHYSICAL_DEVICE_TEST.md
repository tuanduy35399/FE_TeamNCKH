# Physical device smoke check

Physical execution is required before labeling a device as PASS.

Final host status: iPhone READY (no iOS runtime/device on Windows); Android READY (SDK/emulator tooling detected, but no connected or authorized ADB target). The verified arm64-v8a APK is available at `dist/MaiCare-final.apk` for installation on a compatible Android device.

## iPhone

1. Run `npm start`, open the project in Expo Go/development build, and confirm login plus session restore.
2. Test library permission/cancel/select/replace/remove; confirm image-only and image+text results.
3. Test camera deny/settings/grant, capture, retake, and use; confirm no auto-submit.
4. Test text question, follow-up, long-answer scrolling, history detail/reload, keyboard, background/resume, and logout.
5. Check notch/safe areas, bottom tab inset, Roboto, and no horizontal overflow.

## Android

Repeat the iPhone flow, then also verify hardware Back closes modal/navigates correctly, keyboard resize on 360×640, camera permission, gallery `content://` upload, status/navigation bars, background/resume, and logout.
