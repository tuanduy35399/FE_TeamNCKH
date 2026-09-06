import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { colors, spacing } from '../theme';
export function LoadingState({ label = 'Đang tải...' }: { label?: string }) {
  return <View style={styles.wrap}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.body}>{label}</Text></View>;
}
export function StateView({ icon = 'leaf-outline', title, message, actionLabel, onAction }: { icon?: keyof typeof Ionicons.glyphMap; title: string; message?: string; actionLabel?: string; onAction?: () => void }) {
  return <View style={styles.wrap}><Ionicons name={icon} size={42} color={colors.primary} /><Text style={styles.title}>{title}</Text>{message ? <Text style={styles.body}>{message}</Text> : null}{actionLabel && onAction && <View style={styles.button}><AppButton title={actionLabel} onPress={onAction} variant="secondary" /></View>}</View>;
}
const styles = StyleSheet.create({ wrap: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }, title: { color: colors.text, fontSize: 19, fontWeight: '700', textAlign: 'center' }, body: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' }, button: { minWidth: 180, marginTop: spacing.sm } });
