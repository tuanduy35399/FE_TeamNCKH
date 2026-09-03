import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../theme';
type Props = { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'; testID?: string };
export function AppButton({ title, onPress, loading, disabled, variant = 'primary', testID }: Props) {
  const inactive = disabled || loading;
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} disabled={inactive} onPress={onPress} style={({ pressed }) => [styles.base, styles[variant], inactive && styles.disabled, pressed && !inactive && styles.pressed]}>
    {loading ? <ActivityIndicator color={variant === 'secondary' ? colors.primary : colors.surface} /> : <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{title}</Text>}
  </Pressable>;
}
const styles = StyleSheet.create({
  base: { minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1 },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary }, secondary: { backgroundColor: colors.surface, borderColor: colors.primary },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger }, disabled: { opacity: 0.48 }, pressed: { opacity: 0.82 },
  label: { color: colors.surface, fontWeight: '700', fontSize: 16 }, secondaryLabel: { color: colors.primary },
});
