# MaiCare mobile

Ứng dụng Expo/React Native trò chuyện và hỗ trợ chẩn đoán tình trạng mai vàng.

## Kiến trúc

- Ứng dụng chỉ gọi Django tại `https://chat-bot-maivang-backend.onrender.com` (hoặc `EXPO_PUBLIC_API_BASE_URL`).
- Django sở hữu xác thực, lịch sử, tin nhắn và chuyển tiếp nội bộ tới dịch vụ AI/YOLO.
- JWT được lưu bằng Expo SecureStore trên thiết bị. Access token hết hạn được refresh và request gốc được thử lại đúng một lần.
- Cuộc trò chuyện mới được tạo lười ở tin nhắn đầu tiên; mọi tin tiếp theo dùng đúng ID server trả về.
- Ảnh và detections không có trong lịch sử server. Ứng dụng lưu một bản bổ sung theo thiết bị trong document storage và luôn fallback về nội dung văn bản của server.

## Chạy và kiểm tra

```powershell
cd D:\NCKH_FINAL\frontend\MaiVangApp
npm ci
npm run check
npm test
npx expo-doctor@latest
npx expo start --clear
```

Web dùng bridge CORS cục bộ nhưng vẫn chỉ chuyển tiếp tới Django:

```powershell
npm run web
npm run test:e2e
```

Tạo APK cloud sau khi đăng nhập Expo:

```powershell
npx eas-cli@latest build --platform android --profile preview --non-interactive
```

Không đặt token, mật khẩu hoặc khóa bí mật trong biến `EXPO_PUBLIC_*` hay trong git.
