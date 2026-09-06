# Android APK build

Final build date: 2026-09-05.

## Artifact

- Path: `dist/MaiCare-final.apk`
- Package: `com.fe_team_nckh.app`
- Version: `1.0.0` (`versionCode` 1)
- ABI: `arm64-v8a`
- Minimum/target SDK: 24 / 36
- Size: 41,710,356 bytes
- SHA-256: `E3B9E62DAA4AA76E032C27285B88C0FA10496D813A7AFB76F83557C874204B72`
- APK Signature Scheme v2 verification: PASS

The artifact is an internal/device-test release APK produced by an isolated Expo prebuild and local Gradle `assembleRelease`. It is signed with the generated Android debug certificate, not a Play Store release key. Do not publish this artifact to an app store.

The merged release manifest contains camera, Internet, network-state, vibration, and biometric permissions. It does not contain `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO`, or `SYSTEM_ALERT_WINDOW`.

## Install

```powershell
adb install -r D:\NCKH_MaiVang\FE_TeamNCKH\MaiVangApp\dist\MaiCare-final.apk
```

No authorized Android device or emulator was available during the final pass, so signature/manifest/artifact verification is PASS and physical installation remains READY.

## Rebuild options

The checked-in `eas.json` preview profile uses `android.buildType = apk`. When EAS is authenticated:

```powershell
npx eas build --platform android --profile preview --non-interactive --wait
```

For a store release, configure an owned release keystore and build/sign a release artifact through the project’s controlled release process.
