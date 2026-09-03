import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
type Props = PropsWithChildren<{ scroll?: boolean; keyboard?: boolean; testID?: string }>;
export function Screen({ children, scroll = false, keyboard = false, testID }: Props) {
  const body = scroll ? <ScrollView testID={testID} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View testID={testID} style={styles.fill}>{children}</View>;
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>{keyboard ? <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{body}</KeyboardAvoidingView> : body}</SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, fill: { flex: 1 }, scroll: { flexGrow: 1, padding: spacing.lg } });
