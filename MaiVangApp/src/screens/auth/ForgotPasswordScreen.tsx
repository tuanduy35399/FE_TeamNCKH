import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { confirmPasswordReset, requestPasswordReset } from '../../api/auth';
import { ApiError } from '../../api/errors';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { colors, radius, spacing } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    const address = email.trim().toLowerCase();
    setMessage(''); setServerError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { setErrors({ email: 'Vui lòng nhập email hợp lệ.' }); return; }
    setErrors({}); setBusy(true);
    try {
      await requestPasswordReset(address);
      setSentEmail(address); setOtp('');
      setMessage('Nếu email đã được đăng ký, mã OTP sẽ được gửi đến hộp thư. Mã có hiệu lực trong 10 phút.');
    } catch (error) { setServerError(error instanceof ApiError ? error.userMessage : 'Không thể gửi mã OTP.'); }
    finally { setBusy(false); }
  }

  async function submit() {
    const next: Record<string, string> = {};
    if (!/^\d{6}$/.test(otp)) next.otp = 'Vui lòng nhập mã OTP gồm 6 chữ số.';
    if (password.length < 8) next.new_password = 'Mật khẩu cần ít nhất 8 ký tự.';
    if (confirm !== password) next.confirm = 'Mật khẩu xác nhận chưa khớp.';
    setErrors(next); setServerError('');
    if (Object.keys(next).length) return;
    setBusy(true);
    try { await confirmPasswordReset(sentEmail, otp, password); navigation.navigate('Login', { passwordReset: true }); }
    catch (error) {
      if (error instanceof ApiError) {
        const fields = error.fieldErrors || {};
        setErrors({ ...(fields.otp ? { otp: fields.otp } : {}), ...(fields.new_password ? { new_password: fields.new_password } : {}) });
        setServerError(fields.otp || fields.new_password ? 'Vui lòng kiểm tra thông tin được đánh dấu.' : error.userMessage);
      } else setServerError('Không thể đổi mật khẩu.');
    } finally { setBusy(false); }
  }

  return <Screen scroll keyboard testID="forgot-password-screen">
    <View style={styles.header}><Text style={styles.brand}>MaiCare</Text><Text style={styles.title}>Khôi phục mật khẩu</Text><Text style={styles.subtitle}>Nhập email đã đăng ký để nhận mã xác thực.</Text></View>
    <View style={styles.card}>
      <AppInput label="Email đã đăng ký" value={email} onChangeText={value => { setEmail(value); if (sentEmail) { setSentEmail(''); setMessage(''); } }} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!busy} testID="reset-email" />
      {!sentEmail && <AppButton title="Gửi mã OTP" onPress={sendCode} loading={busy} testID="reset-send" />}
      {!!message && <Text accessibilityRole="alert" style={styles.notice}>{message}</Text>}
      {!!sentEmail && <>
        <AppInput label="Mã OTP" value={otp} onChangeText={setOtp} error={errors.otp} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" testID="reset-otp" />
        <AppInput label="Mật khẩu mới" value={password} onChangeText={setPassword} error={errors.new_password} password autoComplete="new-password" testID="reset-password" />
        <AppInput label="Xác nhận mật khẩu mới" value={confirm} onChangeText={setConfirm} error={errors.confirm} password returnKeyType="done" onSubmitEditing={submit} testID="reset-confirm" />
        <AppButton title="Đổi mật khẩu" onPress={submit} loading={busy} testID="reset-submit" />
        <Pressable accessibilityRole="button" disabled={busy} onPress={sendCode} style={styles.link}><Text style={styles.linkText}>Gửi lại mã OTP</Text></Pressable>
        <Text style={styles.hint}>Bạn có thể yêu cầu mã mới sau 60 giây. Kiểm tra cả thư mục spam.</Text>
      </>}
      {!!serverError && <Text accessibilityRole="alert" style={styles.error}>{serverError}</Text>}
      <Pressable accessibilityRole="link" onPress={() => navigation.navigate('Login')} style={styles.link}><Text style={styles.linkText}>Quay lại đăng nhập</Text></Pressable>
    </View>
  </Screen>;
}
const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.lg }, brand: { color: colors.primary, fontWeight: '900', marginBottom: 4 }, title: { color: colors.primaryDark, fontWeight: '800', fontSize: 27 }, subtitle: { color: colors.muted, marginTop: spacing.sm, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  notice: { color: colors.primaryDark, backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.sm, lineHeight: 21 }, error: { color: colors.danger, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: radius.sm },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, linkText: { color: colors.primary, fontWeight: '700' }, hint: { color: colors.muted, lineHeight: 20 },
});
