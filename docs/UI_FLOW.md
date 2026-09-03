# UI and navigation flow

```mermaid
flowchart TD
    A[Launch] --> B[Restore session]
    B -->|valid JWT or refreshed| M[Main tabs]
    B -->|missing or invalid| L[Login]
    L <--> R[Register]
    M --> D[Chẩn đoán]
    M --> H[Lịch sử]
    H --> HD[Chi tiết lịch sử]
    M --> C[Tài khoản]
    C --> O[Đăng xuất]
    C --> X[Xác nhận xóa tài khoản]
    D --> I{Input}
    I --> T[Văn bản]
    I --> P[Hình ảnh]
    I --> PT[Hình ảnh + văn bản]
    T --> S[Sending]
    P --> S
    PT --> S
    S --> Q[Kết quả hoặc lỗi]
    Q --> HR[Backend history refresh]
```

The main navigation has exactly three tabs: **Chẩn đoán**, **Lịch sử**, and **Tài khoản**. History detail is a nested stack screen. Authentication state chooses the auth or protected stack, so Back cannot return to Login after successful login.

The diagnosis composer supports text-only, image-only, and combined input; gallery and camera selection are platform-aware. Because the audited backend exposes none of the diagnosis/history routes, submission currently ends in an explicit server-capability error and no local fake result/history is created.

Not present by design: disease notebook, disease encyclopedia, admin dashboard, user management, role editor, and disease CRUD.
