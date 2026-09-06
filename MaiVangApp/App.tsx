import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors, fonts, shadow } from './src/theme';
const fontAssets = {
  Roboto_400Regular: require('@expo-google-fonts/roboto/Roboto_400Regular.ttf'),
  Roboto_500Medium: require('@expo-google-fonts/roboto/Roboto_500Medium.ttf'),
  Roboto_700Bold: require('@expo-google-fonts/roboto/Roboto_700Bold.ttf'),
};
(Text as unknown as { defaultProps?: Record<string, unknown> }).defaultProps = { ...(Text as unknown as { defaultProps?: Record<string, unknown> }).defaultProps, style: { fontFamily: fonts.regular } };
(TextInput as unknown as { defaultProps?: Record<string, unknown> }).defaultProps = { ...(TextInput as unknown as { defaultProps?: Record<string, unknown> }).defaultProps, style: { fontFamily: fonts.regular } };
export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  useEffect(() => {
    if (Platform.OS === 'web' && globalThis.document) globalThis.document.title = 'MaiCare – Trợ lý chăm sóc mai vàng';
  }, []);
  if (!fontsLoaded && !fontError) return <View style={styles.fontLoading}><ActivityIndicator accessibilityLabel="Đang mở MaiCare" color={colors.primary} /></View>;
  return <SafeAreaProvider><View style={styles.outer}><View testID="app-shell" style={styles.shell}><AuthProvider><RootNavigator /></AuthProvider></View></View></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#E7ECE8' : colors.background, alignItems: 'center' },
  shell: { flex: 1, width: '100%', maxWidth: 460, backgroundColor: colors.background, overflow: 'hidden', ...shadow },
  fontLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
