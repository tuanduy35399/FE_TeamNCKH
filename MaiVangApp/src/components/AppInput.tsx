import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing } from '../theme';
type Props = TextInputProps & { label: string; error?: string; password?: boolean };
export function AppInput({ label, error, password, style, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return <View style={styles.group}><Text style={styles.label}>{label}</Text><View style={[styles.box, !!error && styles.boxError]}>
    <TextInput {...props} style={[styles.input, style]} placeholderTextColor={colors.muted} secureTextEntry={password && !visible} accessibilityLabel={label} />
    {password && <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setVisible(v => !v)} style={styles.eye}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.muted} /></Pressable>}
  </View>{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}</View>;
}
const styles = StyleSheet.create({
  group: { gap: 7 }, label: { color: colors.text, fontWeight: '600', fontSize: 14 },
  box: { minHeight: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md },
  boxError: { borderColor: colors.danger }, input: { flex: 1, minHeight: 48, paddingHorizontal: spacing.md, color: colors.text, fontSize: 16 },
  eye: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, error: { color: colors.danger, fontSize: 13 },
});
