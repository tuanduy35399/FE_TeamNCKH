# Bổ sung hiệu ứng chữ trạng thái ChatScreen

Ngày: 14/11/2026, giờ Việt Nam.

## Thay đổi

- `src/components/WaveText.tsx`: các từ gợn sóng lệch pha, dịch tối đa 1,25 px và thay đổi độ đậm nhẹ; chu kỳ 1,8 giây. Dùng chung một giá trị animation cho cả câu, không thêm thư viện.
- `src/chat/streamProgress.ts`: nhận text từ `message` trong event `progress`. Nếu BE gửi thêm tên giai đoạn LLM mới kèm message, dùng icon xử lý hiện có; nếu thiếu message thì giữ câu mặc định cho chat chữ hoặc ảnh.
- `src/screens/chat/ChatScreen.tsx`: lưu toàn bộ trạng thái gồm stage, message và icon để hiển thị text BE, thay vì bỏ message và tự đặt lại câu chữ. Giữ kiểm tra generation để bỏ qua event của yêu cầu cũ.
- Hiệu ứng dừng khi hoàn tất hoặc gỡ component. Người bật giảm chuyển động vẫn đọc được text tĩnh. Trình đọc màn hình nhận nguyên câu, không phải từng từ.

Icon và vùng hiển thị hiện có trong ChatScreen được giữ nguyên. Hiệu ứng chỉ áp dụng dòng trạng thái cạnh icon, không áp dụng nội dung câu trả lời Markdown.

## Định dạng event FE đang nhận

Theo cấu trúc SSE sẵn có trong dự án, FE xử lý payload JSON trong `data:` như sau:

```text
data: {"type":"progress","stage":"processing","message":"Đang đối chiếu triệu chứng trên lá mai..."}

```

Mỗi frame SSE cần kết thúc bằng hai ký tự xuống dòng. `message` là chuỗi văn bản hiển thị trực tiếp, không được diễn giải thành HTML hoặc Markdown. Đây là cấu trúc đã triển khai và kiểm thử mô phỏng phía FE; chưa đối chiếu với BE đang hoạt động.

## Kết quả xác nhận

| Kiểm tra | Kết quả |
| --- | --- |
| Hồi quy parser SSE, client gửi chữ/ảnh, ánh xạ progress và Markdown | 18/18 PASS |
| Trình duyệt: animation lệch pha, biên độ nhỏ, nhận message SSE chia chunk, đổi text, xuống hàng, hoàn tất, fallback, giảm chuyển động, lỗi và gỡ component | 14/14 PASS |
| Viewport trình duyệt | 320, 390, 1280 px |
| TypeScript riêng WaveText và streamProgress cùng import phụ thuộc | PASS |
| TypeScript toàn dự án | Vẫn 7 diagnostic có sẵn về ref và tham số tutorial; không có lỗi mới ở phần bổ sung |

Kịch bản trình duyệt dùng component và bộ đọc SSE thật với dữ liệu mô phỏng trong bộ nhớ. Chưa kiểm tra kết nối BE thật hoặc thiết bị Android/iOS. Sandbox dùng icon lá minh họa vì `docs/` của checkout vẫn thiếu ảnh icon gốc.

## Xem và chạy lại

Từ gốc dự án:

```bash
node tuanduy_bao_tri/sandbox/server.mjs
```

Mở [sandbox hiệu ứng](http://127.0.0.1:5188/progress). Chạy xác nhận:

```bash
node tuanduy_bao_tri/sandbox/verify-progress.mjs
node --import tsx --test src/chat/streamProgress.test.ts src/api/sse.test.ts src/api/streamClient.test.ts src/components/assistantContent.test.ts
```

Minh chứng: `minh_chung/hieu-ung-chu-browser.json` và `minh_chung/hieu-ung-chu-390.png`.
