# Báo cáo triển khai MaiCare

Ngày xác nhận: 2026-09-03

## Phạm vi hoàn tất

- Đổi nhận diện hiển thị thành **MaiCare — Trợ lý chăm sóc mai vàng** trong Expo, tiêu đề web, màn hình xác thực, loading và header chính.
- Thay màn hình chat-first bằng quy trình photo-first: upload card, bottom sheet nguồn ảnh, camera/fallback, review ảnh chụp, preview/thay/xóa, mô tả tùy chọn và nút theo đúng ba mode.
- Tách thành các component nhỏ: source sheet, camera, capture review, selected card, processing, result, assistant conversation và tutorial.
- Có ba processing card riêng; kết quả chỉ render trường thật và ẩn phần thiếu; chat chỉ mở sau câu hỏi text thành công hoặc hành động hỏi thêm từ kết quả.
- Không có production mock. Khi capability server chưa tồn tại, adapter ném lỗi `unavailable` với copy người dùng bình thường.
- Hướng dẫn lần đầu sáu bước, spotlight bằng bốn lớp che, đo vị trí thật, tự cuộn, cập nhật resize/orientation, lưu hoàn tất và replay từ Account.
- Startup kiểm tra 8000/8010/5175, chỉ dừng tiến trình khi có bằng chứng đường dẫn workspace, và dọn child process.
- Giữ nguyên Expo/React Native Web, SimpleJWT, session restore, `/me`, bridge 8010 và shell di động desktop.

## Backend được tái kiểm tra

Routes thật: đăng ký, đăng nhập/refresh/logout, `/me`, danh sách/chi tiết bệnh, schema/docs. Không có route đăng ký cho kiểm tra ảnh, trợ lý văn bản, phối hợp ảnh + chữ hoặc lịch sử. Backend source không được sửa. Database đã có thay đổi pre-existing trước phiên làm việc và không được dùng làm source change.

Backend baseline: `4a39f535f50fd9867537febbc548b24088dff98b`. Trạng thái tracked ban đầu có duy nhất `db.sqlite3`; trạng thái nguồn tracked cuối không thêm file nào.

## Dữ liệu và bảo mật

- Tutorial key: `maicare_tutorial_v1_completed`.
- Session key cũ được giữ để tránh làm mất phiên đang hoạt động.
- Không ghi test credential vào source.
- Không tải Chromium, Android SDK, emulator hay dependency mới.

## Khởi động

```powershell
cd D:\NCKH_MaiVang\FE_TeamNCKH\MaiVangApp
npm run dev:full
```

URL: http://localhost:5175
