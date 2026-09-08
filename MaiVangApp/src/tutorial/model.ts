export type TutorialTargetName = 'messageArea' | 'composer' | 'send' | 'diagnosis' | 'history' | 'newChat' | 'account';
export const tutorialSteps: Array<{ target: TutorialTargetName; title: string; text: string }> = [
  { target: 'messageArea', title: 'Trợ lý MaiCare AI', text: 'Đặt câu hỏi về triệu chứng, chăm sóc và bệnh trên cây mai vàng. Câu trả lời được lưu theo từng cuộc trò chuyện.' },
  { target: 'composer', title: 'Đặt câu hỏi', text: 'Nhập câu hỏi hoặc mô tả triệu chứng của cây. Bạn có thể tiếp tục hỏi trong cùng một cuộc trò chuyện để giữ ngữ cảnh.' },
  { target: 'send', title: 'Gửi cho MaiCare', text: 'Nhấn để gửi câu hỏi. Khi AI đang xử lý, ứng dụng sẽ hiển thị trạng thái chờ và ngăn gửi trùng.' },
  {
    target: 'diagnosis',
    title: 'Chẩn đoán bằng ảnh',
    text: 'Nhấn nút camera để chụp lá bệnh hoặc chọn ảnh từ thư viện. Ảnh càng rõ, hệ thống càng dễ phân tích.',
  },
  { target: 'history', title: 'Lịch sử trò chuyện', text: 'Xem lại các cuộc trò chuyện trước đây và tiếp tục hỏi trong đúng phiên cũ.' },
  { target: 'newChat', title: 'Tạo cuộc trò chuyện mới', text: 'Bắt đầu một chủ đề mới mà không làm lẫn nội dung với phiên hiện tại.' },
  { target: 'account', title: 'Tài khoản & hướng dẫn', text: 'Quản lý tài khoản và mở lại hướng dẫn sử dụng bất cứ lúc nào.' },
];

export class TutorialTargetRegistry<T> {
  private values = new Map<TutorialTargetName, T>();
  register(name: TutorialTargetName, target: T) { this.values.set(name, target); return () => { if (this.values.get(name) === target) this.values.delete(name); }; }
  get(name: TutorialTargetName) { return this.values.get(name); }
  has(name: TutorialTargetName) { return this.values.has(name); }
}
