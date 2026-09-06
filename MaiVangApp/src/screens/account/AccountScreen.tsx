import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthProvider';
import { AppButton } from '../../components/AppButton';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Screen } from '../../components/Screen';
import { colors, radius, spacing } from '../../theme';
import { useTutorial } from '../../tutorial/TutorialProvider';
import { useNavigation } from '@react-navigation/native';

export function AccountScreen() {
  const { account, signOut, deleteAccount } = useAuth();
  const { replay } = useTutorial();
  const navigation = useNavigation<any>();
  function replayGuide() { navigation.navigate('Diagnosis'); setTimeout(replay, 250); }
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() {
    setBusy(true); setError('');
    try { await deleteAccount(); setConfirming(false); }
    catch (value) { setError(value instanceof ApiError ? value.userMessage : 'Không thể xóa tài khoản.'); }
    finally { setBusy(false); }
  }
  return <Screen scroll testID="account-screen"><View style={styles.hero}><View style={styles.avatar}><Ionicons name="person" size={34} color={colors.primary} /></View><Text style={styles.name}>{account?.name}</Text><Text style={styles.username}>@{account?.username}</Text>{account?.isStaff && <Text style={styles.role}>Quản trị viên</Text>}</View>
    <View style={styles.card}><Row icon="mail-outline" label="Email" value={account?.email || ''} /><Row icon="person-circle-outline" label="Tên đăng nhập" value={account?.username || ''} /></View>
    <View style={styles.guide}><View style={styles.guideIcon}><Ionicons name="compass-outline" size={24} color={colors.primary} /></View><View style={styles.guideCopy}><Text style={styles.guideTitle}>Hướng dẫn sử dụng</Text><Text style={styles.guideText}>Xem lại các bước chính của MaiCare.</Text></View><Pressable testID="replay-tutorial" accessibilityRole="button" onPress={replayGuide} style={styles.guideButton}><Text style={styles.guideButtonText}>Xem lại hướng dẫn</Text></Pressable></View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <View style={styles.actions}><AppButton title="Đăng xuất" variant="secondary" onPress={() => void signOut()} testID="logout-button" /><AppButton title="Xóa tài khoản" variant="danger" onPress={() => setConfirming(true)} testID="delete-account-button" /></View>
    <ConfirmModal visible={confirming} busy={busy} onCancel={() => !busy && setConfirming(false)} onConfirm={remove} />
  </Screen>;
}
function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.row}><Ionicons name={icon} size={22} color={colors.primary} /><View style={styles.rowText}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View></View>;
}
const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg }, avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  name: { color: colors.text, fontSize: 23, fontWeight: '800' }, username: { color: colors.muted, marginTop: 3 }, role: { marginTop: spacing.sm, color: colors.primaryDark, backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md }, row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowText: { flex: 1, gap: 3 }, label: { color: colors.muted, fontSize: 12 }, value: { color: colors.text, fontSize: 16 }, actions: { marginTop: spacing.lg, gap: spacing.md },
  error: { color: colors.danger, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: radius.sm, marginTop: spacing.md },
  guide: { marginTop: spacing.md, padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }, guideIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, guideCopy: { gap: 3 }, guideTitle: { color: colors.text, fontSize: 16, fontWeight: '800' }, guideText: { color: colors.muted }, guideButton: { minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, guideButtonText: { color: colors.primary, fontWeight: '800' },
});
