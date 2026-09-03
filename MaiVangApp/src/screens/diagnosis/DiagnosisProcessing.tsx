import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';

export type ProcessingMode = 'image' | 'text' | 'combined';
export function getProcessingCopy(mode: ProcessingMode) {
  if (mode === 'image') return { title: 'Đang kiểm tra ảnh...', description: 'MaiCare đang xem các dấu hiệu trên lá.', items: [] };
  if (mode === 'text') return { title: 'Đang tìm câu trả lời...', description: 'MaiCare đang xem thông tin bạn cung cấp.', items: [] };
  return { title: 'Đang tổng hợp thông tin...', description: '', items: ['Đang kiểm tra ảnh...', 'Đang xem mô tả của bạn...'] };
}
export function DiagnosisProcessing({ mode }: { mode?: ProcessingMode }) {
  if (!mode) return null; const copy = getProcessingCopy(mode);
  return <Modal visible transparent animationType="fade"><View style={styles.overlay}><View accessibilityRole="progressbar" style={styles.card}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.title}>{copy.title}</Text>{!!copy.description && <Text style={styles.description}>{copy.description}</Text>}{copy.items.map(item => <View key={item} style={styles.item}><View style={styles.dot} /><Text style={styles.itemText}>{item}</Text></View>)}</View></View></Modal>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(248,245,236,.82)' }, card: { width: '100%', maxWidth: 340, padding: 26, alignItems: 'center', gap: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, title: { color: colors.text, fontSize: 19, fontWeight: '900', textAlign: 'center' }, description: { color: colors.muted, textAlign: 'center', lineHeight: 21 }, item: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 5 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }, itemText: { color: colors.muted } });
