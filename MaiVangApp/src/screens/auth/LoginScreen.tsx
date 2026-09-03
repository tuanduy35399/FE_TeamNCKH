import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthProvider';
import { colors, radius, spacing } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export function LoginScreen({ navigation, route }: Props) {
  const { signIn, notice, clearNotice } = useAuth();
  const [username, setUsername] = useState(route.params?.username || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (route.params?.username) setUsername(route.params.username); }, [route.params?.username]);
  async function submit() {
    const next: Record<string, string> = {};
    if (!username.trim()) next.username = 'Vui lòng nhập tên đăng nhập.';
    if (!password) next.password = 'Vui lòng nhập mật khẩu.';
    setErrors(next); setServerError(''); clearNotice();
    if (Object.keys(next).length) return;
    setBusy(true);
    try { await signIn(username.trim(), password); }
    catch (error) { setServerError(error instanceof ApiError ? (error.status === 401 ? 'Tên đăng nhập hoặc mật khẩu không đúng.' : error.userMessage) : 'Không thể đăng nhập.'); }
    finally { setBusy(false); }
  }
  return <Screen scroll keyboard testID="login-screen"><View style={styles.hero}><View style={styles.mark}><Ionicons name="leaf-outline" size={42} color={colors.primary} /></View><Text style={styles.title}>MaiCare</Text><Text style={styles.subtitle}>Trợ lý chăm sóc mai vàng</Text></View>
    <View style={styles.card}>{route.params?.registered && <Text style={styles.success}>Đăng ký thành công. Hãy đăng nhập để tiếp tục.</Text>}{notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
      <AppInput label="Tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} returnKeyType="next" error={errors.username} testID="login-username" />
      <AppInput label="Mật khẩu" value={password} onChangeText={setPassword} password returnKeyType="done" onSubmitEditing={submit} error={errors.password} testID="login-password" />
      {!!serverError && <Text accessibilityRole="alert" style={styles.error}>{serverError}</Text>}
      <AppButton title="Đăng nhập" onPress={submit} loading={busy} testID="login-submit" />
      <Pressable accessibilityRole="link" onPress={() => navigation.navigate('Register')} style={styles.link}><Text style={styles.linkText}>Chưa có tài khoản? <Text style={styles.linkStrong}>Đăng ký</Text></Text></Pressable>
    </View>
  </Screen>;
}
const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.lg }, mark: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { color: colors.primaryDark, fontSize: 28, fontWeight: '800' }, subtitle: { color: colors.muted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.danger, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: radius.sm }, notice: { color: colors.primaryDark, backgroundColor: colors.accentSoft, padding: 12, borderRadius: radius.sm },
  success: { color: colors.primaryDark, backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.sm }, link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, linkText: { color: colors.muted }, linkStrong: { color: colors.primary, fontWeight: '700' },
});
