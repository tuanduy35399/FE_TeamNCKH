# Backend contract audit

Nguồn đã kiểm tra: `chat_bot_maivang-backend`, commit `4a39f535f50fd9867537febbc548b24088dff98b`. Không có route suy đoán trong tài liệu này.

## Runtime và bảo mật

- Python 3.12.9, Django 6.1, Django REST Framework 3.18, SimpleJWT 5.5.1.
- Development origin: `http://127.0.0.1:8000`.
- `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES` dùng JWT; permission mặc định là authenticated.
- Header bảo vệ: `Authorization: Bearer <access>`.
- API JSON/JWT không yêu cầu CSRF cookie.
- `ALLOWED_HOSTS` và `CORS_ALLOWED_ORIGINS` được đọc từ biến môi trường, phân tách bằng dấu phẩy.
- `CorsMiddleware` đứng trước `CommonMiddleware`.
- Tất cả route dưới đây có dấu gạch chéo cuối; frontend giữ nguyên để tránh redirect preflight.
- `runserver` cần `--nostatic` vì repository thiếu `STATIC_URL`; đây là tham số runtime, không sửa backend.

## Route tài khoản thật

Root URL khai báo `path('api/v1/user/', include('user.urls'))`.

| Chức năng | Method + URL | Request | Response |
|---|---|---|---|
| Đăng ký | `POST /api/v1/user/register/` | JSON `username`, `name`, `email`, `password` | 201: `id`, `username`, `name`, `email`; không auto-login |
| Đăng nhập | `POST /api/v1/user/login/` | JSON `username`, `password` | 200: `access`, `refresh` |
| Refresh | `POST /api/v1/user/login/refresh/` | JSON `refresh` | 200: access mới; refresh mới nếu rotation bật |
| Thông tin hiện tại | `GET /api/v1/user/me/` | Bearer access | 200: `id`, `username`, `name`, `email`, `is_staff`, `date_joined` |
| Cập nhật hiện tại | `PATCH /api/v1/user/me/` | Bearer + JSON serializer chấp nhận | 200 |
| Xóa hiện tại | `DELETE /api/v1/user/me/` | Bearer; không yêu cầu mật khẩu | 204 |
| Đăng xuất | `POST /api/v1/user/logout/` | JSON `refresh` | 200 sau blacklist |

`User.USERNAME_FIELD = 'username'`, vì vậy login không dùng email. Register serializer chỉ nhận các trường đã nêu, gọi Django password validators (tối thiểu 8 ký tự theo cấu hình mặc định, kiểm tra tương đồng/phổ biến/toàn số), hash bằng `set_password`. Username và email unique. Lỗi validation là object DRF với mảng lỗi theo tên trường. Frontend không gửi hoặc lưu PasswordHash/`is_staff`.

## Route khác

- `GET /api/v1/diseases/` và `GET /api/v1/diseases/{id}/` có Bearer và trả `id`, `name`, `infor`, `prompt`, `img_ex`. Frontend không dùng vì sổ tay bệnh đã loại khỏi phạm vi.
- `GET /api/v1/schema/`: OpenAPI.
- `GET /api/v1/docs/`: Swagger UI khi cấu hình static phù hợp.

## CORS và web development

Default backend chỉ cho `http://localhost:5174`. Expo được yêu cầu chạy ở 5175, nên tiến trình backend khởi động bằng default trả OPTIONS 200 nhưng **không có** `Access-Control-Allow-Origin` cho 5175. Browser do đó biến phản hồi thành fetch failure dù API trực tiếp vẫn trả 201.

`npm run dev:full` đặt đúng hai origin runtime:

```text
http://localhost:5175,http://127.0.0.1:5175
```

Ngoài ra frontend dùng bridge phát triển loopback tại 8010 để vẫn hoạt động khi một tiến trình backend đã chạy không thể đổi env. Bridge giới hạn origin và route, giữ body với Content-Length để Django WSGI đọc đúng, và không dùng `no-cors` hay tắt bảo mật trình duyệt. Native gọi backend trực tiếp.

## API bắt buộc nhưng không tồn tại

Backend Django không khai báo:

- TH1: upload ảnh/multipart, YOLO hoặc chẩn đoán ảnh;
- TH2: ảnh + text hoặc chuỗi orchestration tương ứng;
- TH3: chat/RAG text;
- danh sách hoặc chi tiết lịch sử.

`history` chỉ có model rỗng/view placeholder và include URL bị comment trong root urls. Do đó không có DTO model result/history, field multipart, MIME/size limit hoặc quy tắc URL ảnh để frontend sử dụng.

File thử nghiệm FastAPI dưới `chat/google_model` không được nối vào Django, chứa import repository không hợp lệ, cần dịch vụ Google/Chroma bên ngoài, và không cung cấp auth/image/history contract. Nó không phải endpoint chạy được của ứng dụng.

Frontend không gọi route tự chế và không thay bằng mock.
