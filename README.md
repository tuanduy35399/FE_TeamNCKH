# MaiCare — Trợ lý chăm sóc mai vàng

MaiCare là ứng dụng di động React Native/Expo dành cho việc kiểm tra tình trạng lá mai và hỏi thông tin chăm sóc. React Native Web được giữ để kiểm thử trên trình duyệt; ở desktop, ứng dụng vẫn nằm trong một vỏ di động rộng tối đa 460 px.

## Chạy toàn bộ hệ thống

```powershell
cd D:\NCKH_MaiVang\FE_TeamNCKH\MaiVangApp
npm run dev:full
```

Mở **http://localhost:5175**. Không cần chạy Django, cầu nối trình duyệt hoặc cấu hình CORS thủ công.

`dev:full` kiểm tra các cổng trước khi chạy. Tiến trình cũ chỉ bị dừng khi đường dẫn hoặc dòng lệnh chứng minh nó thuộc workspace này; tiến trình không liên quan được giữ nguyên và được báo bằng tên/PID. Script chạy Django ở `127.0.0.1:8000`, cầu nối do frontend sở hữu ở `127.0.0.1:8010`, Expo Web ở `localhost:5175`, rồi dọn các tiến trình con khi kết thúc.

## Trải nghiệm chẩn đoán

- Ảnh không kèm chữ: hợp lệ, nút **Kiểm tra ảnh**.
- Ảnh và mô tả: luồng kiểm tra được khuyến nghị; mô tả luôn không bắt buộc.
- Chỉ có chữ: câu hỏi thông tin chung, nút **Hỏi MaiCare**; không được diễn giải như chẩn đoán hình ảnh chính xác.
- Người dùng luôn xem trước ảnh và chủ động gửi. Camera web có khung chụp riêng, thư viện ảnh hoạt động qua lựa chọn trong bottom sheet, và thiết bị không có camera được chuyển hướng nhẹ nhàng.
- Các trạng thái xử lý ảnh, chữ, kết hợp; kết quả có cấu trúc; cùng vùng hỏi thêm đã sẵn sàng cho dữ liệu thật. Trường vắng mặt được ẩn, độ phù hợp không bao giờ được tự tạo.

Production không chứa câu trả lời, bệnh, độ phù hợp hoặc ảnh đánh dấu giả. Backend hiện chỉ có tài khoản và danh mục bệnh; chưa có route cho kiểm tra ảnh, trợ lý hỏi đáp, phối hợp ảnh + chữ hoặc lịch sử. Vì vậy runtime hiển thị thông báo thân thiện thay vì giả lập kết quả.

## Hướng dẫn lần đầu

Hướng dẫn sáu bước dùng spotlight, tự cuộn đến mục tiêu, chặn thao tác nền và thích ứng khi đổi kích thước. Trạng thái hoàn tất/bỏ qua lưu bằng khóa phiên bản:

`maicare_tutorial_v1_completed`

Khóa này độc lập với phiên đăng nhập nên sống qua refresh và logout/login. Có thể chạy lại ở **Tài khoản → Hướng dẫn sử dụng → Xem lại hướng dẫn** mà không xóa dữ liệu người dùng.

## Tài khoản và nền tảng

Đăng ký, đăng nhập SimpleJWT, refresh phiên, `/me`, khôi phục phiên, đăng xuất và xóa tài khoản tiếp tục gọi Django thật. Native lưu phiên trong Expo SecureStore; web dùng localStorage qua cùng lớp trừu tượng. Cầu nối 8010 chỉ phục vụ biên phát triển web và giới hạn route tài khoản/schema.

## Kiểm tra

```powershell
npm run check
npm test
npm run doctor
npm run export:web
npm run test:e2e
npm ls --depth=0
git diff --check
```

E2E dùng Microsoft Edge đã cài sẵn (`channel: msedge`), không tải Chromium, và kiểm tra 320×568, 375×812, 390×844, 430×932 cùng 1280×800.

Tài liệu chi tiết: [báo cáo triển khai](docs/IMPLEMENTATION_REPORT.md) và [kiểm thử chấp nhận](docs/ACCEPTANCE_TESTS.md).
