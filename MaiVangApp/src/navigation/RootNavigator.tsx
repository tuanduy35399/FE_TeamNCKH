import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { LoadingState } from '../components/StateView';
import { AccountScreen } from '../screens/account/AccountScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { HistoryScreen } from '../screens/history/HistoryScreen';
import { colors, fonts } from '../theme';
import type { AuthStackParamList, MainStackParamList, TabParamList } from './types';
import { TutorialProvider, useTutorial } from '../tutorial/TutorialProvider';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border } };

function AuthNavigator() {
  return <AuthStack.Navigator screenOptions={{ headerShadowVisible: false, headerTintColor: colors.primaryDark, headerStyle: { backgroundColor: colors.background } }}>
    <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Đăng ký' }} />
  </AuthStack.Navigator>;
}
const icons: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = { Chat: 'chatbubble-ellipses-outline', History: 'time-outline', Account: 'person-outline' };
const labels: Record<keyof TabParamList, string> = { Chat: 'Trò chuyện', History: 'Lịch sử', Account: 'Tài khoản' };
function AppTabs() {
  return <Tabs.Navigator screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { height: 66, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border },
    tabBarHideOnKeyboard: true,
    tabBarLabelStyle: { fontSize: 12, fontFamily: fonts.medium },
    tabBarLabel: labels[route.name], tabBarIcon: ({ color, size }) => <TutorialTabIcon routeName={route.name} color={color} size={size} />,
  })}>
    <Tabs.Screen name="Chat" component={ChatScreen} />
    <Tabs.Screen name="History" component={HistoryScreen} />
    <Tabs.Screen name="Account" component={AccountScreen} />
  </Tabs.Navigator>;
}
function TutorialTabIcon({ routeName, color, size }: { routeName: keyof TabParamList; color: string; size: number }) {
  const ref = useRef<View>(null); const { registerTarget } = useTutorial();
  const target = routeName === 'History' ? 'history' : routeName === 'Account' ? 'account' : undefined;
  useEffect(() => target ? registerTarget(target, { ref }) : undefined, [target, registerTarget]);
  return <View ref={ref} collapsable={false} testID={target ? `tutorial-target-${target}` : undefined}><Ionicons name={icons[routeName]} color={color} size={size} /></View>;
}
function MainNavigator() {
  return <TutorialProvider><MainStack.Navigator><MainStack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} /></MainStack.Navigator></TutorialProvider>;
}
export function RootNavigator() {
  const { status } = useAuth();
  if (status === 'restoring') return <View style={styles.loading}><LoadingState label="Đang mở MaiCare..." /></View>;
  return <NavigationContainer theme={navTheme} documentTitle={{ formatter: () => 'MaiCare – Trợ lý chăm sóc mai vàng' }}><StatusBar style="dark" />{status === 'authenticated' ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>;
}
const styles = StyleSheet.create({ loading: { flex: 1, backgroundColor: colors.background } });
