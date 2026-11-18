import assert from 'node:assert/strict';
import test from 'node:test';
import { followUpSuggestions, isWeakContextAnswer, topicFromQuestion } from './suggestions';

test('weak-context detection preserves the real answer and only enables helper prompts', () => {
  const answer = 'Dựa trên tài liệu, thông tin hiện có chưa đủ để đưa ra hướng dẫn chi tiết.';
  assert.equal(isWeakContextAnswer(answer), true);
  assert.equal(answer.includes('thông tin hiện có chưa đủ'), true);
});

test('suggestions are reusable and derive the topic rather than hardcoding a disease', () => {
  assert.equal(topicFromQuestion('Bệnh thán thư chăm như nào?'), 'Bệnh thán thư');
  const prompts = followUpSuggestions('Lá mai bị vàng chăm như thế nào?');
  assert.equal(prompts.length, 4); assert.ok(prompts.every(prompt => prompt.includes('Lá mai bị vàng')));
  assert.equal(prompts.some(prompt => /triệu chứng/i.test(prompt)), true);
  assert.equal(prompts.some(prompt => /phòng ngừa/i.test(prompt)), true);
});

test('diagnosis suggestions are focused on disease info, medicine and recovery without answer or confidence', () => {
  const genericPrompts = followUpSuggestions('', true);
  assert.deepEqual(genericPrompts, [
    'Bệnh trên ảnh dùng thuốc gì đặc trị?',
    'Bệnh trên ảnh do nguyên nhân nào gây ra?',
    'Phác đồ phun thuốc luân phiên trị bệnh trên ảnh ra sao?',
    'Lá mai bị như trên ảnh có phục hồi được không?',
  ]);
  assert.equal(genericPrompts.join(' ').includes('%'), false);

  const dynamicPrompts = followUpSuggestions('', true, 'Thán thư');
  assert.deepEqual(dynamicPrompts, [
    'Bệnh Thán thư trên ảnh dùng thuốc gì đặc trị?',
    'Bệnh Thán thư trên ảnh do nguyên nhân nào gây ra?',
    'Phác đồ phun thuốc luân phiên trị Thán thư ra sao?',
    'Lá mai bị Thán thư như trên ảnh có phục hồi được không?',
  ]);
  assert.equal(dynamicPrompts.join(' ').includes('%'), false);

  const healthyPrompts = followUpSuggestions('', true, 'Lá khỏe');
  assert.deepEqual(healthyPrompts, [
    'Cách chăm sóc để lá mai luôn xanh tốt?',
    'Cần bón phân gì cho cây mai giai đoạn này?',
    'Cách phòng ngừa bệnh nấm lá cho mai vàng?',
    'Bao lâu thì nên kiểm tra sâu bệnh định kỳ?',
  ]);
});
