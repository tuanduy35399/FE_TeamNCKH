export type AssistantInline = { text: string; emphasis?: 'bold' | 'italic' | 'code'; url?: string };
export type AssistantBlock = { kind: 'heading' | 'paragraph' | 'bullet' | 'numbered'; inlines: AssistantInline[]; level?: number; number?: string };

export function normalizeAssistantText(value: string): string {
  return value
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/\r\n?/g, '\n')
    .replace(/^[ \t]*(```+|~~~+)[^\n]*$/gm, '')
    .replace(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanPlainText(value: string): string {
  return value.replace(/\*\*|__|`/g, '').replace(/(^|\s)[*_](?=\S)|(?<=\S)[*_](?=\s|$)/g, '$1');
}

export function parseAssistantInline(value: string): AssistantInline[] {
  const pattern = /(\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_)/gi;
  const output: AssistantInline[] = [];
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) output.push({ text: cleanPlainText(value.slice(cursor, index)) });
    const token = match[0];
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/i.exec(token);
    if (link) output.push({ text: link[1]!, url: link[2]! });
    else if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) output.push({ text: token.slice(2, -2), emphasis: 'bold' });
    else if (token.startsWith('`')) output.push({ text: token.slice(1, -1), emphasis: 'code' });
    else output.push({ text: token.slice(1, -1), emphasis: 'italic' });
    cursor = index + token.length;
  }
  if (cursor < value.length) output.push({ text: cleanPlainText(value.slice(cursor)) });
  return output.filter(item => item.text.length > 0);
}

export function parseAssistantContent(value: string): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', inlines: parseAssistantInline(paragraph.join('\n')) });
    paragraph = [];
  };
  for (const original of normalizeAssistantText(value).split('\n')) {
    const line = original.trimEnd();
    if (!line.trim()) { flush(); continue; }
    const heading = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    const bullet = /^\s{0,3}[-*+]\s+(.+)$/.exec(line);
    const numbered = /^\s{0,3}(\d+)[.)]\s+(.+)$/.exec(line);
    if (heading) { flush(); blocks.push({ kind: 'heading', level: heading[1]!.length, inlines: parseAssistantInline(heading[2]!) }); }
    else if (bullet) { flush(); blocks.push({ kind: 'bullet', inlines: parseAssistantInline(bullet[1]!) }); }
    else if (numbered) { flush(); blocks.push({ kind: 'numbered', number: numbered[1]!, inlines: parseAssistantInline(numbered[2]!) }); }
    else paragraph.push(line.replace(/^\s{0,3}>\s?/, ''));
  }
  flush();
  return blocks;
}

export function assistantPlainText(value: string): string {
  return parseAssistantContent(value).map(block => {
    const prefix = block.kind === 'bullet' ? '• ' : block.kind === 'numbered' ? `${block.number}. ` : '';
    return prefix + block.inlines.map(item => item.text).join('');
  }).join('\n');
}
