import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AssistantContent } from '../../src/components/AssistantContent';
import { cases } from './fixtures.mjs';
import { ProgressSandbox } from './progress.jsx';

function Sandbox() {
  const [selected, setSelected] = useState('steps');
  const [markdown, setMarkdown] = useState(cases.steps);
  return <main>
    <h1>Kiểm thử Markdown MaiCare</h1>
    <p>Dữ liệu mẫu; hiển thị bằng AssistantContent thật. Không kết nối BE, không nạp docs/.</p>
    <label htmlFor="case">Tình huống</label>
    <select id="case" value={selected} onChange={event => {
      const name = event.target.value;
      setSelected(name);
      setMarkdown(cases[name]);
    }}>{Object.keys(cases).map(name => <option key={name}>{name}</option>)}</select>
    <label htmlFor="markdown">Nội dung Markdown</label>
    <textarea id="markdown" value={markdown} onChange={event => setMarkdown(event.target.value)} />
    <p className="fixture-note">Nội dung thuốc được chép để đối chiếu ảnh, chỉ dùng kiểm thử bố cục.</p>
    <section aria-label="Bản xem trước" className="message-row">
      <div className="bubble"><AssistantContent testID="markdown-preview">{markdown}</AssistantContent></div>
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(location.pathname === '/progress' ? <ProgressSandbox /> : <Sandbox />);
