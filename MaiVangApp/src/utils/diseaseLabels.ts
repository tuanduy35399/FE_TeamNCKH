const aliases: Record<string, string> = {
  rust: 'Rỉ sắt',
  'ri sat': 'Rỉ sắt',
  anthracnose: 'Thán thư',
  'than thu': 'Thán thư',
  'red spider': 'Nhện đỏ',
  'spider mite': 'Nhện đỏ',
  'nhen do': 'Nhện đỏ',
  'leaf spot': 'Đốm lá',
  'dom la': 'Đốm lá',
  healthy: 'Lá khỏe',
  'healthy leaf': 'Lá khỏe',
  'la khoe': 'Lá khỏe',
};

function aliasKey(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

/** Localizes known model classes and safely humanizes future unknown labels. */
export function diseaseLabel(value?: string) {
  const raw = value?.trim();
  if (!raw) return 'Lớp bệnh chưa xác định';
  const known = aliases[aliasKey(raw)];
  if (known) return known;
  const humanized = raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  return humanized.charAt(0).toLocaleUpperCase('vi-VN') + humanized.slice(1);
}

export function confidenceLabel(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const percent = value >= 0 && value <= 1 ? value * 100 : value;
  const rounded = Math.round(percent * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}
