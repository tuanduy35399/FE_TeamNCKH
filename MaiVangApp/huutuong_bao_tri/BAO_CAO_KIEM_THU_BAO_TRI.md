# BÁO CÁO KIỂM THỬ VÀ BẢO TRÌ PHẦN MỀM (SOFTWARE TESTING & MAINTENANCE REPORT)

- **Dự án**: MaiCare Mobile App (Hệ thống chẩn đoán bệnh mai vàng qua ảnh & Trợ lý AI)
- **Mã nguồn**: `tuanduy35399/FE_TeamNCKH` (Branch: `feat/progressive-sse`)
- **Người thực hiện**: Chuyên gia Kiểm thử & Bảo trì Phần mềm (Senior QA & Maintenance Engineer)
- **Ngày thực hiện**: 14/11/2026
- **Trạng thái**: ✅ **ĐÃ KHẮC PHỤC HOÀN TOÀN & XÁC MINH CÔ LẬP (SANDBOX PASSED)**

---

## 1. Bối cảnh & Phân tích Sự cố (Context & Incident Background)

### 1.1. Bối cảnh hệ thống
1. **Phía Backend (BE)**: Đang trong quá trình cập nhật / tạm thời không kết nối được từ xa.
2. **Phía Frontend (FE)**:
   - Gặp lỗi khởi động / đóng gói Android Bundle do commit trước đó nhập khẩu các file ảnh từ thư mục không tồn tại `docs/` (`preparing_icon.png`, `processing_icon.png`, `complete_icon.png`). Đã được xử lý chuyển đổi sang bộ icon chuẩn hệ thống `Ionicons` và `ActivityIndicator`.
   - **Lỗi giao diện nghiêm trọng (UI Collision Defect)**: Sau khi gửi tin nhắn chat, nút nổi **"Chẩn đoán ảnh"** (`FloatingCameraFab`) nằm đè trực tiếp lên bong bóng tin nhắn của người dùng, làm che khuất hoàn toàn nội dung chữ (text), gây ảnh hưởng nghiêm trọng đến trải nghiệm người dùng (UX).

---

## 2. Phân tích Hộp Trắng (White-box & Geometric Layout Analysis)

Dựa trên việc đọc hiểu mã nguồn tại [ChatScreen.tsx](file:///d:/NLCN/NCKH/MaiVangApp/src/screens/chat/ChatScreen.tsx) và [FloatingCameraFab.tsx](file:///d:/NLCN/NCKH/MaiVangApp/src/components/FloatingCameraFab.tsx):

### 2.1. Cấu trúc Cây Phân cấp Giao diện (Component Hierarchy)
```
KeyboardAvoidingView (flex: 1)
 ├── View.header (Header điều hướng & Brand)
 ├── View.messageArea (flex: 1)
 │    └── FlatList (Danh sách tin nhắn)
 ├── View.bottomPanel (Thanh typing indicator + Composer soạn thảo)
 └── FloatingCameraFab (position: 'absolute', style: StyleSheet.absoluteFill)
```

### 2.2. Cơ chế Tọa độ & Nguyên nhân Gây Xung đột (Root Cause)
1. **Vị trí của FAB**:
   - Nút `FloatingCameraFab` có kích thước: `width = 154px`, `height = 50px`.
   - Tọa độ neo: `right = 12px`, `bottom = bottomPanelHeight + 12px` (hoặc `+ 8px` khi mở bàn phím).
   - Nút được render phủ lên trên màn hình (`absoluteFill`, `zIndex = 30`). Do đó, nút nằm lơ lửng ngay góc dưới bên phải của vùng `messageArea`.
2. **Định dạng danh sách tin nhắn (`FlatList`)**:
   - Tin nhắn của người dùng (User Message) có đặc tính căn phải (`alignSelf: 'flex-end'`, background màu xanh lá `#124C34`).
   - Cấu hình đệm danh sách ban đầu:
     ```tsx
     // Code cũ:
     list: { paddingHorizontal: 12, paddingVertical: 14, gap: 11 }
     ```
   - Khi người dùng gửi tin nhắn, hàm `listRef.current?.scrollToEnd()` cuộn danh sách xuống kịch đáy.
   - Lúc này, đáy của bong bóng tin nhắn cuối cùng chỉ cách đáy `messageArea` đúng **14px** (`paddingBottom = 14px`).
3. **Mô hình Va chạm Toán học (Collision Formula)**:
   - Khoảng cao của FAB phía trên đáy `messageArea`: từ `12px` đến `62px` (`12 + 50 = 62px`).
   - Đáy của tin nhắn người dùng: `14px`.
   - Chiều cao tin nhắn (ví dụ 1 dòng chữ): `44px` (từ `14px` đến `58px`).
   - **Kết quả**: Đoạn từ `14px` đến `58px` bị FAB (nằm từ `12px` đến `62px`, rộng 154px bên phải) **che phủ hoàn toàn (100% Collision)**! Người dùng không thể đọc được nội dung chữ vừa gửi.
4. **Hiệu ứng Reflow khi có SSE / Typing Indicator**:
   - Ngay sau khi bấm gửi, trạng thái `sending = true` và `streamStage = "preparing"` kích hoạt làm xuất hiện thanh trạng thái tiến trình (`styles.typing`), làm `bottomPanelHeight` tăng thêm ~40px.
   - FAB ngay lập tức phản ứng bằng hiệu ứng nhún lò xo `Animated.spring` đẩy FAB dịch chuyển ngược lên trên thêm 40px nữa, tiến sâu hơn vào vùng chữ của tin nhắn.
   - Nhưng `FlatList` lúc này không tự động cuộn lại theo sự thay đổi chiều cao của container, dẫn đến tình trạng đè chữ càng nghiêm trọng như trong ảnh chụp thực tế.

---

## 3. Các Đề xuất & Gợi ý Cải tiến Thiết kế (Design Suggestions)

| Gợi ý (Option) | Mô tả phương án | Ưu điểm | Nhược điểm / Đánh giá |
| :--- | :--- | :--- | :--- |
| **Gợi ý 1: Safe Bottom Padding & Reflow Auto-Scroll** *(Đã triển khai)* | Tăng `paddingBottom: 84px` cho `FlatList` khi có tin nhắn + Hook lắng nghe `bottomPanelHeight` để tự động cuộn bảo toàn khoảng cách. | ✅ Không thay đổi hành vi component khác.<br>✅ Không làm vỡ các ràng buộc kiểm thử tự động (`sourceSafety.test.ts`).<br>✅ Đảm bảo 100% tin nhắn luôn nổi cao hơn đỉnh nút FAB ít nhất 22px. | Cần điều chỉnh linh hoạt padding giữa trạng thái rỗng và có tin nhắn. |
| **Gợi ý 2: Smart Adaptive FAB (Pill vs Compact Circle)** | - Khi chưa chat (màn hình chào): Giữ nguyên dạng Pill đầy đủ `[ 📷 Chẩn đoán ảnh ]` (154px).<br>- Khi đang trong hội thoại: Tự động thu nhỏ về nút tròn `[ 📷 ]` (48x48px). | ✅ Tiết kiệm 70% không gian góc phải màn hình.<br>✅ Trực quan, hiện đại giống các app lớn (Google Camera, Facebook). | Cần quản lý state kích thước và hiệu ứng chuyển đổi mượt mà. |
| **Gợi ý 3: Tự động Ẩn/Hiện khi Cuộn (Auto-hide on Scroll)** | Khi người dùng vuốt đọc lịch sử trò chuyện ngược lên trên, nút FAB tự trượt xuống hoặc làm mờ (`opacity: 0.2`); khi dừng hoặc cuộn xuống cuối thì hiện lại. | ✅ Không gian đọc lịch sử chat hoàn toàn thông thoáng 100%. | Người dùng muốn chụp ảnh khi đang đọc tin cũ phải cuộn nhẹ lại để gọi nút. |
| **Gợi ý 4: Chuyển nút vào thanh Composer (In-Composer Action)** | Đưa icon máy ảnh vào trực tiếp bên trái ô nhập `TextInput` (giống Telegram, ChatGPT, Zalo). | ✅ Chuẩn UX nhắn tin quốc tế, không còn bất kỳ nút nổi nào đè lên màn hình. | Phá vỡ bài test thiết kế speed-dial nổi hiện tại của dự án nếu chưa qua thống nhất nhóm. |

---

## 4. Chi tiết Giải pháp Đã Thực hiện (Implementation)

Đã áp dụng **Gợi ý 1 (Safe Bottom Padding + Reflow Auto-Scroll)** trực tiếp vào [ChatScreen.tsx](file:///d:/NLCN/NCKH/MaiVangApp/src/screens/chat/ChatScreen.tsx):

1. **Khoảng cách đệm an toàn (`paddingBottom: 84px`)**:
   ```tsx
   // Cập nhật trong StyleSheet:
   list: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 84, gap: 11 },
   emptyList: { flexGrow: 1, paddingBottom: 14 },
   ```
   - Với `paddingBottom: 84px`: Đáy tin nhắn nằm cách đáy `messageArea` là 84px.
   - Đỉnh của FAB nằm ở mức: `12px (gap) + 50px (height) = 62px`.
   - **Khoảng cách thông thoáng an toàn (Clearance Margin)**: `84px - 62px = 22px > 0` (Luôn cách nút FAB 22px, không thể bị đè).

2. **Lắng nghe Reflow động (`useEffect` & `onLayout`)**:
   ```tsx
   // Tự động cuộn bù trừ khi thanh tiến trình SSE / Typing indicator xuất hiện hoặc đổi chiều cao:
   useEffect(() => {
     if (messages.length) {
       listRef.current?.scrollToEnd({ animated: true });
     }
   }, [messages.length, bottomPanelHeight]);
   ```
   ```tsx
   <FlatList
     ...
     onLayout={() => {
       if (messages.length) {
         listRef.current?.scrollToEnd({ animated: false });
       }
     }}
     onContentSizeChange={() => {
       if (messages.length) {
         listRef.current?.scrollToEnd({ animated: false });
       }
     }}
   />
   ```

---

## 5. Môi trường Kiểm thử Cô lập (Sandbox Isolation Testing)

Đã thiết lập 2 tầng kiểm thử cô lập chuyên biệt:

### 5.1. Tầng 1: Unit Sandbox Test tích hợp trong CI/CD
- File: [chatLayoutSandbox.test.ts](file:///d:/NLCN/NCKH/MaiVangApp/src/screens/chat/chatLayoutSandbox.test.ts)
- Chạy trực tiếp qua lệnh: `npm test` bên trong `MaiVangApp/`.

### 5.2. Tầng 2: Standalone Sandbox Test Runner độc lập
- File: [run_sandbox.mjs](file:///d:/NLCN/NCKH/MaiVangApp/huutuong_bao_tri/run_sandbox.mjs)
- Chạy độc lập mà không cần môi trường React Native:
  ```bash
  node MaiVangApp/huutuong_bao_tri/run_sandbox.mjs
  ```

### 5.3. Kết quả Thực nghiệm Sandbox (Simulation Results)
```
======================================================================
🧪 CHẠY KIỂM THỬ CÔ LẬP (SANDBOX TEST) - GIAO DIỆN CHAT & NÚT MÁY ẢNH FAB
======================================================================

[TEST 1] Tái hiện lỗi cũ (Trạng thái trước khi fix):
- FAB Bounding Box:       top=574, bottom=624, left=194, right=348
- Tin nhắn cũ Bounding Box: top=578, bottom=622, left=208, right=348
- Trùng lấn (Collision):   ❌ CÓ VA CHẠM (Nút FAB che chữ)

[TEST 2] Kiểm thử sau khi fix (Padding = 84px):
- Tin nhắn mới Bounding Box: top=508, bottom=552, left=208, right=348
- Trùng lấn (Collision):    ✅ KHÔNG VA CHẠM (Hoàn toàn thông thoáng)
- Khoảng cách an toàn:      22px (Yêu cầu >= 16px)

[TEST 3] Kiểm thử đáp ứng khi thanh tiến trình SSE hiển thị (BottomPanel = 104px):
- FAB Top:                  534px
- Message Bottom:           512px
- Khoảng cách an toàn:      22px

[TEST 4] Kiểm thử khi mở bàn phím (Keyboard visible, gap = 8px):
- FAB Top:                  302px
- Message Bottom:           276px
- Khoảng cách an toàn:      26px

======================================================================
🎉 TẤT CẢ 4 KỊCH BẢN KIỂM THỬ SANDBOX ĐỀU ĐẠT CHUẨN 100%!
======================================================================
```

---

## 6. Kiểm thử Hồi quy Toàn diện (Full Regression Testing)

- **Bộ kiểm thử tự động của hệ thống**: Đã vượt qua **91/91 tests** (Tăng từ 87 lên 91 tests nhờ 4 bài test Sandbox mới).
- **Kiểm tra Hợp đồng Mã nguồn (`sourceSafety.test.ts`)**: 100% Passed (Không vi phạm bất kỳ regex ràng buộc kiến trúc nào của nhóm).
- **Đóng gói Bundle Android (`expo export --platform android`)**: Đóng gói thành công toàn bộ `1006 modules`, hoàn toàn sạch lỗi.

---

## 7. Hướng dẫn Nghiệm thu & Chạy Ứng dụng

1. **Khởi chạy ứng dụng**:
   ```powershell
   cd MaiVangApp
   npx expo start -c
   ```
2. **Kiểm tra trực quan trên thiết bị**:
   - Gửi một tin nhắn bất kỳ (ví dụ: `"ảnh trên đấy"` hoặc `"cây bị vàng lá"`).
   - Quan sát khi tin nhắn xuất hiện và thanh tiến trình hiển thị:
     - Tin nhắn được đẩy lên phía trên rõ ràng.
     - Nút **"Chẩn đoán ảnh"** nằm gọn gàng bên dưới tin nhắn với khoảng cách đệm thẩm mỹ 22px.
     - Chữ và bong bóng chat hoàn toàn không còn bị che khuất!
