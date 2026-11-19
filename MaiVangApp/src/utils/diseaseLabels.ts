const aliases: Record<string, string> = {
  rust: 'Rỉ sắt',
  'ri sat': 'Rỉ sắt',
  anthracnose: 'Thán thư',
  'colletotrichum anthracnose': 'Thán thư',
  'glomerella anthracnose': 'Thán thư',
  'than thu': 'Thán thư',
  'red spider': 'Nhện đỏ',
  'spider mite': 'Nhện đỏ',
  'nhen do': 'Nhện đỏ',
  'leaf spot': 'Đốm lá',
  'alternaria leaf spot': 'Đốm lá',
  'pestalotia leaf spot': 'Cháy lá',
  'pink disease': 'Bệnh hồng',
  'benh hong': 'Bệnh hồng',
  'dom la': 'Đốm lá',
  healthy: 'Lá khỏe',
  'healthy leaf': 'Lá khỏe',
  'la khoe': 'Lá khỏe',
};

function aliasKey(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

// Colors sampled from the supplied model-class palette. Keep the model label
// here: the two anthracnose classes share a Vietnamese label but have different colors.
export const diseaseColors: Record<string, string> = {
  'alternaria leaf spot': '#FE0057',
  'colletotrichum anthracnose': '#00B6EA',
  'glomerella anthracnose': '#00FFCD',
  healthy: '#FF7F00',
  'pestalotia leaf spot': '#8527FF',
  'pink disease': '#FFFE00',
};

export function diseaseColor(value?: string) {
  const key = aliasKey(value || '');
  if (diseaseColors[key]) return diseaseColors[key];
  // Older history may only contain the generic disease name.
  const legacyClasses: Record<string, string> = {
    'leaf spot': 'alternaria leaf spot', 'dom la': 'alternaria leaf spot',
    anthracnose: 'colletotrichum anthracnose', 'than thu': 'colletotrichum anthracnose',
    'chay la': 'pestalotia leaf spot', 'benh hong': 'pink disease',
    'healthy leaf': 'healthy', 'la khoe': 'healthy',
  };
  return diseaseColors[legacyClasses[key] || ''] || '#B8C4BE';
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
