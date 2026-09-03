# Kiểm thử chấp nhận MaiCare

Ngày chạy: 2026-09-03. Trình duyệt: Microsoft Edge cài sẵn qua Playwright `msedge`. Backend Django và bridge/frontend thật được khởi động bằng `npm run dev:full`.

## Tutorial

| ID | Kết quả | Bằng chứng tự động |
|---|---|---|
| TUT-01 fresh storage | PASS | Welcome xuất hiện sau đăng nhập mới |
| TUT-02 next/image spotlight | PASS | Bước 2 và target ảnh xuất hiện |
| TUT-03 back | PASS | Trở về welcome |
| TUT-04 skip + persist | PASS | Overlay đóng, localStorage = `true` |
| TUT-05 refresh | PASS | Không xuất hiện lại |
| TUT-06 logout/login | PASS | Không xuất hiện lại |
| TUT-07 replay Account | PASS | Mở lại từ nút riêng |
| TUT-08 finish | PASS | Sáu bước hoàn tất và persist |
| TUT-09 390 px | PASS | Tooltip nằm trong viewport |
| TUT-10 320 px | PASS | Sáu tooltip nằm trong viewport, nội dung dùng được |

## Diagnosis

| Nhóm | Kết quả |
|---|---|
| Không input disabled; image-only/text-only/combined enabled | PASS |
| Bottom sheet mở/hủy | PASS |
| Library chọn, preview, thay, xóa | PASS |
| Camera web unavailable và fallback thư viện | PASS |
| Camera native permission/cancel/error paths | PASS (code + type/export validation) |
| Processing image/text/combined | PASS (component + copy validation) |
| Result partial fields/long scroll/confidence conditional | PASS (component + export validation) |
| Follow-up chỉ ở conversation/result | PASS |
| Không có production response giả | PASS (unit test) |
| Không có copy kỹ thuật ở UI | PASS (source audit) |

## Auth thật

| Hành vi | Kết quả |
|---|---|
| Register 201 | PASS |
| Login 200 | PASS |
| `/me` 200 | PASS |
| Refresh/session restore | PASS |
| Logout 200 | PASS |
| Login lại | PASS |
| Delete account 204 | PASS |

## Viewport và chất lượng web

320×568, 375×812, 390×844, 430×932 và 1280×800 đều PASS: không tràn ngang. Desktop giữ shell ≤460 px và bottom tabs nằm trong shell. Console error, page error và request failure không mong đợi đều bằng 0 trong E2E.

## Lệnh xác nhận

| Lệnh | Kết quả |
|---|---|
| `npm run check` | PASS |
| `npm test` | PASS — 4/4 |
| `npm run doctor` | PASS — 17/17 |
| `npm run export:web` | PASS |
| `npm run test:e2e` | PASS — Edge |
| `npm ls --depth=0` | PASS |
| `git diff --check` | PASS |
| `npm run dev:full` clean start | PASS |
| Tự nhận diện/dừng stale process của workspace | PASS — 8000/8010/5175 |
| Child cleanup sau shutdown | PASS — cả ba cổng trống |
