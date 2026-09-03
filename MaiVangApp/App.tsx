import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors, shadow } from './src/theme';
export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web' && globalThis.document) globalThis.document.title = 'MaiCare – Trợ lý chăm sóc mai vàng';
  }, []);
  return <SafeAreaProvider><View style={styles.outer}><View testID="app-shell" style={styles.shell}><AuthProvider><RootNavigator /></AuthProvider></View></View></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#E7ECE8' : colors.background, alignItems: 'center' },
  shell: { flex: 1, width: '100%', maxWidth: 460, backgroundColor: colors.background, overflow: 'hidden', ...shadow },
});
