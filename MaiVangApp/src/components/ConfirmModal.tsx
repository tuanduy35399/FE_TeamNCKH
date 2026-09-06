import { Modal, StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { colors, radius, spacing } from '../theme';
type Props = { visible: boolean; busy?: boolean; onCancel: () => void; onConfirm: () => void };
export function ConfirmModal({ visible, busy, onCancel, onConfirm }: Props) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.overlay}><View accessibilityRole="alert" style={styles.card}>
      <Text style={styles.title}>Xóa tài khoản?</Text>
      <Text style={styles.message}>Tài khoản và dữ liệu liên quan sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.</Text>
      <View style={styles.actions}>
        <View style={styles.action}><AppButton title="Hủy" variant="secondary" onPress={onCancel} disabled={busy} /></View>
        <View style={styles.action}><AppButton title="Xóa tài khoản" variant="danger" onPress={onConfirm} loading={busy} testID="confirm-delete" /></View>
      </View>
    </View></View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,25,17,.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 400, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontWeight: '800', fontSize: 21 }, message: { color: colors.muted, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }, action: { flex: 1 },
});
