import { Platform, StyleSheet } from 'react-native';
export const fonts = { regular: 'Roboto_400Regular', medium: 'Roboto_500Medium', bold: 'Roboto_700Bold' } as const;
const originalCreate = StyleSheet.create.bind(StyleSheet);
const styleSheet = StyleSheet as unknown as { create: typeof StyleSheet.create; __maicareRoboto?: boolean };
if (!styleSheet.__maicareRoboto) {
  styleSheet.create = ((styles: Record<string, Record<string, unknown>>) => originalCreate(Object.fromEntries(Object.entries(styles).map(([name, style]) => {
    if (!style || typeof style !== 'object') return [name, style];
    const next = { ...style };
    const weight = String(next.fontWeight || '');
    if (weight) {
      next.fontFamily = weight === '500' || weight === '600' ? fonts.medium : weight === '700' || weight === '800' || weight === '900' ? fonts.bold : fonts.regular;
      delete next.fontWeight;
    }
    return [name, next];
  })))) as typeof StyleSheet.create;
  styleSheet.__maicareRoboto = true;
}
export const colors = {
  primary: '#24734B', primaryDark: '#124C34', primarySoft: '#E8F3EC', accent: '#D7A928',
  accentSoft: '#FFF5CF', background: '#F8F5EC', surface: '#FFFFFF', text: '#18221C',
  muted: '#667269', border: '#DDE4DD', danger: '#A83A35', dangerSoft: '#FBECEA', disabled: '#AAB4AE',
  overlay: 'rgba(12, 24, 17, 0.72)',
} as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 22, xl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const shadow = Platform.select({ web: { boxShadow: '0 10px 30px rgba(20, 55, 37, 0.10)' }, default: { shadowColor: '#143725', shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 } });
