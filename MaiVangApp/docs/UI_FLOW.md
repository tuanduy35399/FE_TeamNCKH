# UI flow

## Authentication

Register → login → authenticated profile restore → three-tab application. Registration uses only `name`, `email`, `username`, and `password`. Logout revokes the refresh token when reachable and clears local session state. Account deletion requires confirmation and then removes that user’s local image fallback.

## Chẩn đoán

The initial screen is diagnosis-first:

- image only → **Kiểm tra ảnh**;
- image plus optional description → **Kiểm tra ảnh**;
- text only → **Hỏi MaiCare**, shown as general care guidance rather than visual diagnosis.

**Thêm ảnh** opens a bottom sheet with camera, library, and cancel. Camera capture is never auto-submitted: the user sees **Ảnh vừa chụp**, then chooses **Chụp lại** or **Dùng ảnh này**. A selected image shows **Thay ảnh** and **Xóa**.

Processing copy changes by mode. Results show only deployed fields: checked image, detector names/per-item confidence when provided, and the assistant answer. **Hỏi thêm về kết quả** reveals the secondary follow-up composer and reuses the same server conversation.

## Lịch sử

Server `HistoryChat` rows are top-level cards and ordered messages are children. The list shows title and Vietnamese timestamp, supports pull-to-refresh, and opens a functional detail screen. Image bytes/detections missing from the server are merged from user-scoped local metadata by conversation ID; server text is never copied locally.

## Hướng dẫn và điều hướng

The versioned six-step tutorial covers welcome, image, optional description, action, History, and Account. It supports skip, back, next, completion persistence, responsive remeasurement, and replay through **Tài khoản → Hướng dẫn sử dụng → Xem lại hướng dẫn**.

Primary tabs are exactly **Chẩn đoán**, **Lịch sử**, and **Tài khoản**.
