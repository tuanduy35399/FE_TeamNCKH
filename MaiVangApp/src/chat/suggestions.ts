const weakSignals = [
  'thông tin hiện có chưa đủ', 'tài liệu hiện tại chưa', 'ngữ cảnh chưa đủ', 'không đủ thông tin',
  'chưa có đủ thông tin', 'không thể kết luận', 'chưa thể kết luận', 'không tìm thấy thông tin',
];

export function isWeakContextAnswer(answer: string): boolean {
  const normalized = answer.toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');
  return weakSignals.some(signal => normalized.includes(signal));
}

export function topicFromQuestion(question: string): string {
  const normalized = question.replace(/[?!.]+$/g, '').replace(/\s+/g, ' ').trim();
  const shortened = normalized
    .replace(/\b(chăm|điều trị|xử lý)\s+(như thế nào|như nào|ra sao).*$/iu, '')
    .replace(/\b(cách|làm sao để)\s+(chăm|điều trị|xử lý).*$/iu, '')
    .trim();
  return shortened.length >= 3 && shortened.length <= 80 ? shortened : 'tình trạng này';
}

export function followUpSuggestions(question: string, diagnosis = false): string[] {
  if (diagnosis) return ['Triệu chứng điển hình là gì?', 'Cách phòng ngừa?', 'Cách chăm sóc cây?', 'Khi nào nên kiểm tra lại?'];
  const topic = topicFromQuestion(question);
  return [
    `Triệu chứng ${topic} trên mai vàng là gì?`,
    `Nguyên nhân nào thường gây ${topic}?`,
    `Cách phòng ngừa ${topic} trên mai vàng?`,
    `Khi nào nên xử lý ${topic}?`,
  ];
}
