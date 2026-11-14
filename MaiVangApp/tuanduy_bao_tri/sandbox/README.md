# Sandbox kiểm thử Markdown ChatScreen

Môi trường này dùng trực tiếp `src/components/AssistantContent.tsx` cùng parser và theme của ứng dụng. Không cần BE, đăng nhập, Expo hay các ảnh trong `docs/`. Không sửa file cấu hình hoặc dependency của dự án.

## Mở bản xem tương tác

Chạy từ thư mục gốc MaiVangApp với các dependency hiện có:

```bash
node tuanduy_bao_tri/sandbox/server.mjs
```

Mở [sandbox](http://127.0.0.1:5188). Chọn bộ dữ liệu hoặc sửa ô Markdown để kiểm tra nội dung của bạn. Dừng server bằng Ctrl+C. Nếu cổng đã được dùng:

```bash
MARKDOWN_SANDBOX_PORT=5190 node tuanduy_bao_tri/sandbox/server.mjs
```

## Chạy kiểm thử tự động

```bash
node tuanduy_bao_tri/sandbox/verify.mjs
```

Cần Google Chrome và các gói `playwright`, `esbuild`, `react`, `react-dom`, `react-native-web`, font Roboto có trong `node_modules` của dự án. Kịch bản mặc định dùng Chrome có sẵn. Nếu máy dùng một kênh Chromium khác đã cài tương thích Playwright, có thể chỉ định bằng biến `MARKDOWN_BROWSER_CHANNEL`.

Kịch bản mở server ở cổng trống, kiểm tra 320/360/390/412/1280 px, chặn mọi yêu cầu ra ngoài sandbox và tự đóng các tài nguyên sau kiểm tra. Kết quả JSON và ảnh ghi vào `tuanduy_bao_tri/minh_chung/sau-sua-*`; lần chạy mới ghi đè minh chứng sau sửa. Mã thoát 0 nghĩa là tất cả kiểm tra đạt.

Tùy chọn `--baseline` chỉ dùng khi đã chủ động đặt mã ứng dụng ở trạng thái trước sửa. Nó không tự khôi phục phiên bản cũ và sẽ ghi đè các minh chứng `truoc-sua-*` hiện có; không dùng tùy chọn này để xác nhận bản sửa hiện tại.

## Phạm vi

Khung bong bóng mô phỏng thông số bố cục liên quan của ChatScreen. Component Markdown, parser, theme và font là tài nguyên thật. Đây là kiểm thử cô lập trên web; không thay thế nghiệm thu ChatScreen đầy đủ hoặc thiết bị native.

Nội dung thuốc trong fixture chỉ được chép để tái hiện lỗi trình bày trong ảnh.

## Hiệu ứng chữ trạng thái

Sau khi mở server, truy cập [bản xem hiệu ứng](http://127.0.0.1:5188/progress). Nhập event JSON rồi chọn **Nhận event** để kiểm tra dòng chữ; các nút **Hoàn tất**, **Lỗi**, **Ẩn trạng thái** giúp kiểm tra kết thúc hiệu ứng. Icon lá là minh họa trong sandbox, không thay icon của ChatScreen.

```json
{"type":"progress","stage":"processing","message":"Đang đối chiếu triệu chứng trên lá mai..."}
```

Chạy kiểm tra riêng hiệu ứng:

```bash
node tuanduy_bao_tri/sandbox/verify-progress.mjs
```

Kết quả ghi vào `tuanduy_bao_tri/minh_chung/hieu-ung-chu-browser.json`. Trang mẫu dùng bộ đọc SSE thật với luồng dữ liệu trong bộ nhớ, không gọi BE. Event hoàn tất phụ được dùng để đóng luồng mô phỏng; trạng thái chỉ kết thúc trên trang mẫu khi chọn **Hoàn tất** hoặc tự gửi event `complete`.
