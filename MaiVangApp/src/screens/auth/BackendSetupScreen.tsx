import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackendConfigCard } from '../../components/BackendConfigCard';
import { Screen } from '../../components/Screen';
import { colors, spacing } from '../../theme';
export function BackendSetupScreen() { return <Screen scroll keyboard testID="backend-setup-screen"><View style={styles.hero}><Ionicons name="server-outline" size={42} color={colors.primary} /><Text style={styles.title}>Thiết lập MaiCare</Text><Text style={styles.subtitle}>Điện thoại và máy tính cần ở cùng mạng LAN.</Text></View><BackendConfigCard setup /></Screen>; }
const styles = StyleSheet.create({ hero: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }, title: { color: colors.primaryDark, fontSize: 26, fontWeight: '800' }, subtitle: { color: colors.muted, textAlign: 'center' } });
