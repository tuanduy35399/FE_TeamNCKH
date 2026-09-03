import { Platform } from 'react-native';
export const colors = {
  primary: '#24734B', primaryDark: '#124C34', primarySoft: '#E8F3EC', accent: '#D7A928',
  accentSoft: '#FFF5CF', background: '#F8F5EC', surface: '#FFFFFF', text: '#18221C',
  muted: '#667269', border: '#DDE4DD', danger: '#A83A35', dangerSoft: '#FBECEA', disabled: '#AAB4AE',
  overlay: 'rgba(12, 24, 17, 0.72)',
} as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 22, xl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const shadow = Platform.select({ web: { boxShadow: '0 10px 30px rgba(20, 55, 37, 0.10)' }, default: { shadowColor: '#143725', shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 } });
