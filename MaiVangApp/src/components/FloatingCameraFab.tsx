import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Animated, Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { floatingFabBottom } from '../navigation/mobileLayout';
import { colors, radius, spacing } from '../theme';

const HEIGHT = 50;
export function FloatingCameraFab({ bottomReserved, keyboardVisible, targetRef, onCamera, onGallery }: { bottomReserved: number; keyboardVisible: boolean; targetRef: RefObject<View | null>; onCamera: () => void; onGallery: () => void }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [tips, setTips] = useState(false);
  const bottom = useRef(new Animated.Value(floatingFabBottom(bottomReserved))).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const pressed = useRef(new Animated.Value(1)).current;
  const resolvedBottom = floatingFabBottom(bottomReserved, keyboardVisible ? 8 : 12);
  useEffect(() => { Animated.spring(bottom, { toValue: resolvedBottom, useNativeDriver: false, damping: 20, stiffness: 180 }).start(); }, [bottom, resolvedBottom]);
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.035, duration: 1100, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
    ]));
    animation.start(); return () => animation.stop();
  }, [pulse]);
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    {open ? <Pressable accessibilityLabel="Đóng tùy chọn ảnh" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} /> : null}
    <Animated.View ref={targetRef} collapsable={false} testID="tutorial-target-diagnosis" style={[styles.floating, { right: Math.max(12, insets.right + 12), bottom }]}>
      {open ? <View testID="camera-speed-dial" style={styles.actions}>
        <Quick testID="fab-tips-option" icon="information-circle-outline" label="Mẹo chụp ảnh rõ" onPress={() => { setOpen(false); setTips(true); }} />
        <Quick testID="fab-gallery-option" icon="images-outline" label="Chọn từ thư viện" onPress={() => { setOpen(false); onGallery(); }} />
        <Quick testID="fab-camera-option" icon="camera-outline" label="Chụp ảnh" onPress={() => { setOpen(false); onCamera(); }} />
      </View> : null}
      <Animated.View pointerEvents="none" style={[styles.glow, { transform: [{ scale: pulse }] }]} />
      <Animated.View style={{ transform: [{ scale: pressed }] }}><Pressable testID="diagnosis-toggle" accessibilityRole="button" accessibilityLabel="Chẩn đoán ảnh" onPress={() => { Keyboard.dismiss(); setOpen(value => !value); }} onPressIn={() => Animated.spring(pressed, { toValue: .96, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(pressed, { toValue: 1, useNativeDriver: true }).start()} style={styles.pill}><Ionicons name="camera" size={21} color="#fff" /><Text style={styles.label}>Chẩn đoán ảnh</Text></Pressable></Animated.View>
    </Animated.View>
    <Tips visible={tips} onClose={() => setTips(false)} />
  </View>;
}
function Quick({ testID, icon, label, onPress }: { testID: string; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) { return <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={styles.quick}><Ionicons name={icon} size={19} color={colors.primaryDark}/><Text style={styles.quickText}>{label}</Text></Pressable>; }
const PHOTO_TIPS = ['Chụp nơi đủ sáng','Lấy nét vào vùng có triệu chứng','Để lá hoặc vùng bệnh chiếm phần lớn khung','Tránh ảnh rung hoặc quá mờ','Chụp ảnh khác nếu triệu chứng xuất hiện ở nhiều vị trí'];
function Tips({ visible, onClose }: { visible: boolean; onClose: () => void }) { return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable style={styles.tipCard} onPress={() => undefined}><Text style={styles.tipTitle}>Mẹo chụp ảnh rõ</Text>{PHOTO_TIPS.map(tip => <View key={tip} style={styles.tipRow}><Ionicons name="checkmark-circle" size={18} color={colors.primary}/><Text style={styles.tipText}>{tip}</Text></View>)}<Pressable accessibilityRole="button" onPress={onClose} style={styles.gotIt}><Text style={styles.gotItText}>Đã hiểu</Text></Pressable></Pressable></Pressable></Modal>; }
const styles = StyleSheet.create({
  floating: { position: 'absolute', width: 154, height: HEIGHT, zIndex: 30, elevation: 12 },
  glow: { position: 'absolute', inset: 0, borderRadius: 25, backgroundColor: colors.primary, opacity: .18 },
  pill: { width: 154, height: HEIGHT, paddingHorizontal: 16, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderWidth: 1, borderColor: '#83BE99', shadowColor: '#143725', shadowOpacity: .22, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 10 },
  label: { color: '#fff', fontSize: 14, fontWeight: '900' }, actions: { position: 'absolute', right: 0, bottom: HEIGHT + 9, gap: 8, width: 178, zIndex: 31 },
  quick: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: '#13291c', shadowOpacity: .14, shadowRadius: 7, elevation: 7 }, quickText: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 },
  overlay: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(12,24,17,.48)' }, tipCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: 12 }, tipTitle: { color: colors.primaryDark, fontSize: 20, fontWeight: '900' }, tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, tipText: { flex: 1, color: colors.text, lineHeight: 20 }, gotIt: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary }, gotItText: { color: '#fff', fontWeight: '900' },
});
