import assert from 'node:assert/strict';
import test from 'node:test';
import { confidenceLabel, diseaseLabel } from './diseaseLabels';

test('localizes every supported model alias to Vietnamese', () => {
  const cases: Record<string, string> = {
    rust: 'Rỉ sắt', 'ri-sat': 'Rỉ sắt', ri_sat: 'Rỉ sắt', 'rỉ sắt': 'Rỉ sắt',
    anthracnose: 'Thán thư', 'than-thu': 'Thán thư', than_thu: 'Thán thư', 'thán thư': 'Thán thư',
    red_spider: 'Nhện đỏ', spider_mite: 'Nhện đỏ', 'nhen-do': 'Nhện đỏ', nhen_do: 'Nhện đỏ', 'nhện đỏ': 'Nhện đỏ',
    leaf_spot: 'Đốm lá', 'dom-la': 'Đốm lá', dom_la: 'Đốm lá', 'đốm lá': 'Đốm lá',
    healthy: 'Lá khỏe', healthy_leaf: 'Lá khỏe', 'healthy-leaf': 'Lá khỏe', 'la-khoe': 'Lá khỏe', la_khoe: 'Lá khỏe', 'lá khỏe': 'Lá khỏe',
  };
  for (const [input, expected] of Object.entries(cases)) assert.equal(diseaseLabel(input), expected, input);
});

test('unknown labels are safely humanized without inventing a disease', () => {
  assert.equal(diseaseLabel('future_model_class'), 'Future model class');
  assert.equal(diseaseLabel('  NEW-LABEL  '), 'New label');
  assert.equal(diseaseLabel(), 'Lớp bệnh chưa xác định');
});

test('confidence uses real values and preserves useful decimal precision', () => {
  assert.equal(confidenceLabel(0.849), '84.9%');
  assert.equal(confidenceLabel(0.85), '85%');
  assert.equal(confidenceLabel(84.94), '84.9%');
  assert.equal(confidenceLabel(undefined), undefined);
});
