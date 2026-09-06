import assert from 'node:assert/strict';
import test from 'node:test';
import { assistantPlainText, normalizeAssistantText, parseAssistantContent } from './assistantMarkdown';

const markdown = '# Tình trạng lá\n\n**Nguyên nhân có thể**\n\n- Thiếu dinh dưỡng\n- Nấm bệnh\n\n## Gợi ý\n\n1. Quan sát mặt dưới lá\n2. Giữ cây thông thoáng\n\n`Không dùng quá liều`\n\n[Thông tin tham khảo](https://example.com)';

test('normalizes escaped newlines and trailing separators', () => {
  assert.equal(normalizeAssistantText('Xin chào\\n\\n---\\n'), 'Xin chào');
});

test('parses headings, lists, emphasis, code, and safe links without raw markers', () => {
  const blocks = parseAssistantContent(markdown);
  assert.deepEqual(blocks.map(block => block.kind), ['heading', 'paragraph', 'bullet', 'bullet', 'heading', 'numbered', 'numbered', 'paragraph', 'paragraph']);
  const rendered = assistantPlainText(markdown);
  assert.match(rendered, /^Tình trạng lá/m);
  assert.match(rendered, /• Thiếu dinh dưỡng/);
  assert.match(rendered, /1\. Quan sát mặt dưới lá/);
  assert.match(rendered, /Thông tin tham khảo/);
  assert.doesNotMatch(rendered, /#|\*\*|`|\]\(|\]\(https/);
  const link = blocks.flatMap(block => block.inlines).find(item => item.url);
  assert.deepEqual(link, { text: 'Thông tin tham khảo', url: 'https://example.com' });
});

test('keeps user-facing paragraphs readable and Vietnamese intact', () => {
  assert.equal(assistantPlainText('Lá mai bị vàng.\\nHãy quan sát thêm.\n\nChăm sóc nhẹ nhàng.'), 'Lá mai bị vàng.\nHãy quan sát thêm.\nChăm sóc nhẹ nhàng.');
});
