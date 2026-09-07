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

test('diagnosis suggestions are generic questions and contain no answer or confidence', () => {
  const prompts = followUpSuggestions('', true);
  assert.deepEqual(prompts, ['Triệu chứng điển hình là gì?', 'Cách phòng ngừa?', 'Cách chăm sóc cây?', 'Khi nào nên kiểm tra lại?']);
  assert.equal(prompts.join(' ').includes('%'), false);
});
