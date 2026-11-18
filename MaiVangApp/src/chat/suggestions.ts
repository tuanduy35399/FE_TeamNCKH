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

export function followUpSuggestions(question: string, diagnosis = false, disease?: string): string[] {
  if (diagnosis) {
    const rawDisease = disease?.trim();
    if (rawDisease && rawDisease !== 'Lá khỏe' && rawDisease !== 'Lớp bệnh chưa xác định') {
      const cleanDisease = rawDisease.replace(/^bệnh\s+/i, '').trim();
      return [
        `Bệnh ${cleanDisease} trên ảnh dùng thuốc gì đặc trị?`,
        `Bệnh ${cleanDisease} trên ảnh do nguyên nhân nào gây ra?`,
        `Phác đồ phun thuốc luân phiên trị ${cleanDisease} ra sao?`,
        `Lá mai bị ${cleanDisease} như trên ảnh có phục hồi được không?`,
      ];
    }
    if (rawDisease === 'Lá khỏe') {
      return [
        'Cách chăm sóc để lá mai luôn xanh tốt?',
        'Cần bón phân gì cho cây mai giai đoạn này?',
        'Cách phòng ngừa bệnh nấm lá cho mai vàng?',
        'Bao lâu thì nên kiểm tra sâu bệnh định kỳ?',
      ];
    }
    return [
      'Bệnh trên ảnh dùng thuốc gì đặc trị?',
      'Bệnh trên ảnh do nguyên nhân nào gây ra?',
      'Phác đồ phun thuốc luân phiên trị bệnh trên ảnh ra sao?',
      'Lá mai bị như trên ảnh có phục hồi được không?',
    ];
  }
  const topic = topicFromQuestion(question);
  return [
    `Triệu chứng ${topic} trên mai vàng là gì?`,
    `Nguyên nhân nào thường gây ${topic}?`,
    `Cách phòng ngừa ${topic} trên mai vàng?`,
    `Khi nào nên xử lý ${topic}?`,
  ];
}
