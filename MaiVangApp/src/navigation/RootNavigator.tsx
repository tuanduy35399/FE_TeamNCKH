import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { LoadingState, StateView } from '../components/StateView';
import { AccountScreen } from '../screens/account/AccountScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { HistoryScreen } from '../screens/history/HistoryScreen';
import { colors, fonts } from '../theme';
import type { AuthStackParamList, MainStackParamList, TabParamList } from './types';
import { TutorialProvider, useTutorialTarget } from '../tutorial/TutorialProvider';
import { ChatSessionProvider } from '../chat/ChatSessionProvider';
import { useBackendConfig } from '../api/BackendConfigProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bottomTabLayout, TAB_BAR_ICON_HEIGHT, TAB_BAR_ITEM_PADDING, TAB_BAR_LABEL_GAP } from './mobileLayout';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border } };

function AuthNavigator() {
  return <AuthStack.Navigator screenOptions={{ headerShadowVisible: false, headerTintColor: colors.primaryDark, headerStyle: { backgroundColor: colors.background } }}>
    <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Quên mật khẩu' }} />
    <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Đăng ký' }} />
  </AuthStack.Navigator>;
}
const icons: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = { Chat: 'chatbubble-ellipses-outline', History: 'time-outline', Account: 'person-outline' };
const labels: Record<keyof TabParamList, string> = { Chat: 'Trò chuyện', History: 'Lịch sử', Account: 'Tài khoản' };
function AppTabs() {
  const insets = useSafeAreaInsets();
  const [labelHeights, setLabelHeights] = useState<Partial<Record<keyof TabParamList, number>>>({});
  const labelHeight = Math.max(0, ...Object.values(labelHeights));
  const layout = bottomTabLayout(insets.bottom, labelHeight);
  return <Tabs.Navigator screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarHideOnKeyboard: true,
    tabBarLabelPosition: 'below-icon',
    tabBarAccessibilityLabel: labels[route.name],
    tabBarStyle: {
      height: layout.height,
      paddingBottom: layout.bottomPadding,
      paddingHorizontal: 0,
      marginLeft: 16 + insets.left,
      marginRight: 16 + insets.right,
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      elevation: 0,
    },
    tabBarBackground: () => <View testID="bottom-tab-surface" pointerEvents="none" importantForAccessibility="no"
      aria-hidden style={[styles.tabSurface, { bottom: layout.bottomPadding }]} />,
    tabBarIconStyle: styles.tabIcon,
    tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} color={color} size={Math.min(size, 22)} />,
    tabBarLabel: ({ color }) => <View style={[styles.tabLabelSlot, { minHeight: labelHeight }]}>
      <Text testID={`bottom-tab-label-${route.name}`} style={[styles.tabLabel, { color }]}
        onLayout={({ nativeEvent: { layout: { height } } }) => {
          setLabelHeights(previous => previous[route.name] === height ? previous : { ...previous, [route.name]: height });
        }}>{labels[route.name]}</Text>
    </View>,
    tabBarButton: props => route.name === 'Chat' ? <PlatformPressable {...props} style={[props.style, styles.tabButton]} /> : <TutorialTabButton {...props} target={route.name === 'History' ? 'history' : 'account'} />,
  })}>
    <Tabs.Screen name="Chat" component={ChatScreen} />
    <Tabs.Screen name="History" component={HistoryScreen} />
    <Tabs.Screen name="Account" component={AccountScreen} />
  </Tabs.Navigator>;
}
function TutorialTabButton({ target, ...props }: BottomTabBarButtonProps & { target: 'history' | 'account' }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const onLayout = useTutorialTarget(target, ref);
  return <PlatformPressable {...props} style={[props.style, styles.tabButton]} ref={ref} collapsable={false} onLayout={onLayout} testID={`tutorial-target-${target}`} />;
}
function MainNavigator() {
  return <TutorialProvider><ChatSessionProvider><MainStack.Navigator><MainStack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} /></MainStack.Navigator></ChatSessionProvider></TutorialProvider>;
}
export function RootNavigator() {
  const { status } = useAuth();
  const backend = useBackendConfig();
  if (!backend.ready) return <View style={styles.loading}><LoadingState label="Đang mở MaiCare..." /></View>;
  if (!backend.baseUrl) return <View style={styles.loading}><StateView title="Ứng dụng chưa sẵn sàng" message="Vui lòng liên hệ bộ phận hỗ trợ để được trợ giúp." /></View>;
  if (status === 'restoring') return <View style={styles.loading}><LoadingState label="Đang mở MaiCare..." /></View>;
  return <NavigationContainer theme={navTheme} documentTitle={{ formatter: () => 'MaiCare – Trợ lý chăm sóc mai vàng' }}><StatusBar style="dark" />{status === 'authenticated' ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>;
}
const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background },
  tabSurface: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: colors.surface, borderRadius: 30, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#143725', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 6,
  },
  tabButton: { justifyContent: 'center', paddingVertical: TAB_BAR_ITEM_PADDING },
  tabIcon: { height: TAB_BAR_ICON_HEIGHT, flexGrow: 0, flexShrink: 0 },
  tabLabelSlot: { alignSelf: 'stretch', flexShrink: 0, marginTop: TAB_BAR_LABEL_GAP },
  tabLabel: {
    fontFamily: fonts.medium, fontSize: 12, textAlign: 'center', maxWidth: '100%',
    flexShrink: 0,
  },
});
