import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ImageSourceSheet({ visible, error, onOpenSettings, onCamera, onLibrary, onClose }: { visible: boolean; error?: string; onOpenSettings?: () => void; onCamera: () => void; onLibrary: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(28, insets.bottom + spacing.md) }]} onPress={() => undefined}>
    <View style={styles.handle} /><Text style={styles.title}>Thêm ảnh</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {onOpenSettings && <Pressable accessibilityRole="button" onPress={onOpenSettings} style={styles.settings}><Text style={styles.settingsText}>Mở cài đặt</Text></Pressable>}
    <Option testID="camera-option" icon="camera-outline" title="Chụp ảnh" subtitle="Dùng camera để chụp ảnh mới" onPress={onCamera} />
    <Option testID="library-option" icon="images-outline" title="Chọn từ thư viện" subtitle="Chọn ảnh có sẵn trên thiết bị" onPress={onLibrary} />
    <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Hủy</Text></Pressable>
  </Pressable></Pressable></Modal>;
}
function Option({ testID, icon, title, subtitle, onPress }: { testID: string; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  return <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.option, pressed && styles.pressed]}><View style={styles.icon}><Ionicons name={icon} size={25} color={colors.primary} /></View><View style={styles.copy}><Text style={styles.optionTitle}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.muted} /></Pressable>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,24,17,.48)' }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.lg, gap: spacing.sm },
  handle: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: colors.border, marginBottom: 6 }, title: { color: colors.text, fontSize: 21, fontWeight: '900', marginBottom: spacing.sm },
  option: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, pressed: { backgroundColor: colors.primarySoft }, icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, gap: 3 }, optionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 13 },
  error: { color: colors.danger, backgroundColor: colors.dangerSoft, padding: 11, borderRadius: radius.sm }, settings: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary }, settingsText: { color: colors.primary, fontWeight: '800' }, cancel: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 }, cancelText: { color: colors.danger, fontWeight: '800' },
});
