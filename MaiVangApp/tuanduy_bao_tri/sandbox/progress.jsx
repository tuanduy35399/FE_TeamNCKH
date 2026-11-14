import { useState } from 'react';
import { View, Text } from 'react-native';
import { WaveText } from '../../src/components/WaveText';
import { progressForEvent } from '../../src/chat/streamProgress';
import { consumeSseResponse } from '../../src/api/sse';

export function ProgressSandbox() {
  const [progress, setProgress] = useState(progressForEvent({ type: 'progress', stage: 'processing', message: 'MaiCare đang phân tích thông tin...' }));
  const [error, setError] = useState('');
  const [raw, setRaw] = useState('{"type":"progress","stage":"processing","message":"Đang đối chiếu triệu chứng trên lá mai..."}');
  function receive(event) {
    if (event.type === 'complete') setProgress({ stage: 'complete', icon: 'complete', message: 'Đã nhận kết quả.' });
    else if (event.type === 'error') { setProgress(undefined); setError(event.message); }
    else {
      const next = progressForEvent(event);
      if (next) { setProgress(next); setError(''); }
    }
  }
  async function send() {
    try {
      const event = JSON.parse(raw);
      // Use the real SSE consumer, including a split UTF-8/network chunk.
      const bytes = new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
      const stream = new ReadableStream({ start(controller) {
        controller.enqueue(bytes.slice(0, 37));
        controller.enqueue(bytes.slice(37));
        if (event.type !== 'complete' && event.type !== 'error') {
          controller.enqueue(new TextEncoder().encode('data: {"type":"complete","answer":"Mẫu kiểm thử"}\n\n'));
        }
        controller.close();
      } });
      // A synthetic terminal event closes the mock transport only; keep progress visible for inspection.
      await consumeSseResponse(new Response(stream), next => {
        if (next.type !== 'complete' || event.type === 'complete') receive(next);
      });
    } catch (value) { setError(value.message); }
  }
  return <main>
    <h1>Hiệu ứng chữ trạng thái</h1>
    <p>Mô phỏng event BE qua bộ đọc SSE thật; icon lá chỉ dùng minh họa trong sandbox.</p>
    <label htmlFor="event">Event SSE mẫu</label>
    <textarea id="event" value={raw} onChange={event => setRaw(event.target.value)} />
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
      <button onClick={() => void send()}>Nhận event</button>
      <button onClick={() => receive({ type: 'complete' })}>Hoàn tất</button>
      <button onClick={() => receive({ type: 'error', message: 'Kết nối thử nghiệm bị gián đoạn.' })}>Lỗi</button>
      <button onClick={() => setProgress(undefined)}>Ẩn trạng thái</button>
    </div>
    <section aria-label="Bản xem trạng thái" style={{ paddingTop: 32 }}>
      {progress && <View testID="progress-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: '#fff' }}>
        <Text accessibilityLabel="Icon minh họa" style={{ width: 32, height: 32, fontSize: 24 }}>🍃</Text>
        <WaveText animated={progress.stage !== 'complete'}>{progress.message}</WaveText>
      </View>}
      {error && <p role="alert">{error}</p>}
    </section>
  </main>;
}
