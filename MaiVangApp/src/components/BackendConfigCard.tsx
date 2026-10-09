import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useBackendConfig } from '../api/BackendConfigProvider';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { colors, radius, spacing } from '../theme';

export function BackendConfigCard({ onBeforeChange, setup = false }: { onBeforeChange?: () => Promise<void>; setup?: boolean }) {
  const backend = useBackendConfig();
  const [url, setUrl] = useState(backend.baseUrl || backend.buildDefault || '');
  const [busy, setBusy] = useState<'test' | 'save' | 'reset' | null>(null);
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const mode = backend.baseUrl && backend.buildDefault && backend.baseUrl === backend.buildDefault ? 'Mặc định / Deploy' : 'Máy chủ cục bộ / tùy chỉnh';
  useEffect(() => setUrl(backend.baseUrl || backend.buildDefault || ''), [backend.baseUrl, backend.buildDefault]);
  async function run(kind: 'test' | 'save' | 'reset') {
    setBusy(kind); setError(''); setMessage('');
    try {
      if (kind === 'test') { await backend.test(url); setMessage('Kết nối Django thành công.'); }
      if (kind === 'save') { if (backend.baseUrl && url.trim() !== backend.baseUrl) await onBeforeChange?.(); const saved = await backend.save(url); setUrl(saved); setMessage('Đã lưu máy chủ cục bộ.'); }
      if (kind === 'reset') { if (backend.baseUrl) await onBeforeChange?.(); const next = await backend.reset(); setUrl(next || ''); setMessage(next ? 'Đã khôi phục địa chỉ mặc định.' : 'Đã xóa địa chỉ. Vui lòng cấu hình máy chủ.'); }
    } catch (value) { setError(value instanceof Error ? value.message : 'Không thể cập nhật máy chủ.'); }
    finally { setBusy(null); }
  }
  return <View style={styles.card} testID="backend-config-card"><Text style={styles.title}>{setup ? 'Kết nối máy chủ MaiCare' : 'Máy chủ'}</Text><Text style={styles.copy}>{setup ? 'Nhập địa chỉ Django đang chạy trên máy tính cùng mạng Wi-Fi hoặc địa chỉ Django đã triển khai.' : 'Ứng dụng chỉ kết nối tới Django. Địa chỉ RAG và YOLO không được hiển thị.'}</Text>{!setup && <Text testID="backend-mode" style={styles.mode}>Chế độ: {mode}</Text>}<AppInput label="Địa chỉ Django" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder="http://192.168.1.15:8000" testID="backend-url-input" />{!!backend.baseUrl && <Text selectable style={styles.current}>Máy chủ hiện tại: {backend.baseUrl}</Text>}{!!message && <Text accessibilityRole="alert" style={styles.success}>{message}</Text>}{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<View style={styles.actions}><AppButton title="Kiểm tra kết nối" variant="secondary" loading={busy === 'test'} disabled={!!busy} onPress={() => void run('test')} testID="backend-test" /><AppButton title="Lưu" loading={busy === 'save'} disabled={!!busy} onPress={() => void run('save')} testID="backend-save" /></View>{!setup && <AppButton title="Đặt lại mặc định" variant="secondary" loading={busy === 'reset'} disabled={!!busy} onPress={() => void run('reset')} testID="backend-reset" />}</View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md }, title: { color: colors.primaryDark, fontSize: 18, fontWeight: '800' }, copy: { color: colors.muted, lineHeight: 20 }, mode: { color: colors.primaryDark, fontWeight: '700' }, current: { color: colors.text, fontSize: 12 }, actions: { gap: spacing.sm }, success: { color: colors.primaryDark, backgroundColor: colors.primarySoft, padding: 10, borderRadius: radius.sm }, error: { color: colors.danger, backgroundColor: colors.dangerSoft, padding: 10, borderRadius: radius.sm } });
