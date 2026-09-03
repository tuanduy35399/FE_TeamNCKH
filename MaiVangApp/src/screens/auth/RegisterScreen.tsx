import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { register } from '../../api/auth';
import { ApiError } from '../../api/errors';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { colors, radius, spacing } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
export function RegisterScreen({ navigation }: Props) {
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof form) => (value: string) => setForm(current => ({ ...current, [key]: value }));
  async function submit() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Vui lòng nhập họ và tên.';
    if (!form.email.trim()) next.email = 'Vui lòng nhập email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Email chưa đúng định dạng.';
    if (!form.username.trim()) next.username = 'Vui lòng nhập tên đăng nhập.';
    if (!form.password) next.password = 'Vui lòng nhập mật khẩu.';
    else if (form.password.length < 8) next.password = 'Mật khẩu cần ít nhất 8 ký tự.';
    if (form.confirm !== form.password) next.confirm = 'Mật khẩu xác nhận chưa khớp.';
    setErrors(next); setServerError('');
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim().toLowerCase(), username: form.username.trim(), password: form.password });
      navigation.navigate('Login', { username: form.username.trim(), registered: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const fields = error.fieldErrors || {};
        setErrors(current => ({ ...current, ...(fields.username ? { username: fields.username } : {}), ...(fields.email ? { email: fields.email } : {}), ...(fields.password ? { password: fields.password } : {}) }));
        setServerError(error.status === 400 && (fields.username || fields.email) ? 'Vui lòng sửa thông tin được đánh dấu.' : error.userMessage);
      } else setServerError('Không thể đăng ký tài khoản.');
    } finally { setBusy(false); }
  }
  return <Screen scroll keyboard testID="register-screen"><View style={styles.header}><Text style={styles.brand}>MaiCare</Text><Text style={styles.title}>Tạo tài khoản</Text><Text style={styles.subtitle}>Trợ lý chăm sóc mai vàng đồng hành cùng bạn.</Text></View>
    <View style={styles.card}>
      <AppInput label="Họ và tên" value={form.name} onChangeText={update('name')} error={errors.name} autoComplete="name" />
      <AppInput label="Email" value={form.email} onChangeText={update('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <AppInput label="Tên đăng nhập" value={form.username} onChangeText={update('username')} error={errors.username} autoCapitalize="none" autoCorrect={false} testID="register-username" />
      <AppInput label="Mật khẩu" value={form.password} onChangeText={update('password')} error={errors.password} password autoComplete="new-password" testID="register-password" />
      <AppInput label="Xác nhận mật khẩu" value={form.confirm} onChangeText={update('confirm')} error={errors.confirm} password returnKeyType="done" onSubmitEditing={submit} testID="register-confirm" />
      {!!serverError && <Text accessibilityRole="alert" style={styles.error}>{serverError}</Text>}
      <AppButton title="Đăng ký" onPress={submit} loading={busy} testID="register-submit" />
      <Pressable accessibilityRole="link" onPress={() => navigation.navigate('Login')} style={styles.link}><Text style={styles.linkText}>Đã có tài khoản? <Text style={styles.linkStrong}>Đăng nhập</Text></Text></Pressable>
    </View>
  </Screen>;
}
const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.lg }, brand: { color: colors.primary, fontWeight: '900', marginBottom: 4 }, title: { color: colors.primaryDark, fontWeight: '800', fontSize: 27 }, subtitle: { color: colors.muted, marginTop: spacing.sm, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.danger, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: radius.sm },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, linkText: { color: colors.muted }, linkStrong: { color: colors.primary, fontWeight: '700' },
});
