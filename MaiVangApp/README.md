# MaiCare

**Trợ lý chăm sóc mai vàng** là ứng dụng di động Expo/React Native hỗ trợ ba luồng: kiểm tra bằng ảnh, ảnh kèm mô tả, và hỏi đáp bằng văn bản. Cùng một mã nguồn chạy trên iOS, Android và React Native Web.

## Dịch vụ mặc định

Ứng dụng di động mặc định gọi trực tiếp hai dịch vụ HTTPS đã triển khai:

- xác thực, tài khoản, lịch sử và chẩn đoán: `https://chat-bot-maivang-backend.onrender.com`
- trợ lý hội thoại: `https://chat-service-nckh.onrender.com`

Không cần máy tính phát triển hoặc dịch vụ localhost để chạy trên điện thoại. Có thể sao chép `.env.example` thành `.env.local` để đổi URL mà không sửa mã nguồn. Chỉ URL công khai được phép đặt trong biến `EXPO_PUBLIC_*`; không đặt khóa bí mật ở frontend.

## Cài đặt và chạy

```powershell
cd D:\NCKH_MaiVang\FE_TeamNCKH\MaiVangApp
npm install
npm start
```

- iPhone: mở Expo Go hoặc development build và quét mã QR.
- Android: quét mã QR bằng Expo Go, hoặc chạy `npm run android` khi có thiết bị/emulator.
- Web dùng API triển khai: `npm run web`, sau đó mở `http://localhost:5175`.
- Toàn bộ backend local dành cho phát triển: `npm run dev:full`.

Web dùng bridge chỉ trong môi trường phát triển vì các dịch vụ triển khai không cấp CORS cho origin localhost. iOS và Android luôn gọi HTTPS trực tiếp.

## Android APK

APK cài thử đã xác minh nằm tại `dist/MaiCare-final.apk` (arm64-v8a, SHA-256 `E3B9E62DAA4AA76E032C27285B88C0FA10496D813A7AFB76F83557C874204B72`). Đây là bản internal/device-test ký bằng debug certificate, không phải bản ký phát hành Play Store. Xem `docs/APK_BUILD.md` để biết manifest, cách cài và quy trình EAS.

## Kiểm tra

```powershell
npm run check
npm test
npm run doctor
npm run export:web
npx expo export --platform ios
npx expo export --platform android
npm run test:e2e
npm ls --depth=0
git diff --check
```

E2E dùng Microsoft Edge đã cài đặt và không tải thêm Chromium. Chi tiết hợp đồng và phạm vi kiểm thử nằm trong thư mục `docs`.
