import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';
import { clampFab, normalizedFab, restoreFab, snapFab, type FabBounds, type FabSide } from '../chat/fabPosition';
import { loadFabPosition, saveFabPosition } from '../chat/fabStorage';

const WIDTH = 154;
const HEIGHT = 50;
const MARGIN = 12;
const DRAG_THRESHOLD = 7;

export function FloatingCameraFab({ bottomReserved, keyboardVisible, targetRef, onCamera, onGallery }: {
  bottomReserved: number; keyboardVisible: boolean; targetRef: RefObject<View | null>; onCamera: () => void; onGallery: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [side, setSide] = useState<FabSide>('right');
  const [open, setOpen] = useState(false);
  const [tips, setTips] = useState(false);
  const [restored, setRestored] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const current = useRef({ x: 0, y: 0 });
  const savedPosition = useRef<import('../chat/fabPosition').SavedFabPosition | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const dragged = useRef(false);
  const bounds: FabBounds = useMemo(() => ({
    minX: Math.max(MARGIN, insets.left + MARGIN),
    maxX: Math.max(MARGIN, layout.width - insets.right - MARGIN - WIDTH),
    minY: Math.max(72, insets.top + 58),
    maxY: Math.max(72, layout.height - bottomReserved - MARGIN - HEIGHT - (keyboardVisible ? 6 : 0)),
  }), [layout, bottomReserved, insets, keyboardVisible]);

  useEffect(() => { void loadFabPosition().then(saved => { savedPosition.current = saved; setRestored(true); }); }, []);
  useEffect(() => {
    if (!restored || !layout.width) return;
    const next = restoreFab(savedPosition.current, bounds);
    current.current = next; position.setValue(next); setSide(next.side);
  }, [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, layout.width, restored]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
    onPanResponderGrant: () => { origin.current = current.current; dragged.current = false; setOpen(false); },
    onPanResponderMove: (_, gesture) => {
      if (Math.hypot(gesture.dx, gesture.dy) < DRAG_THRESHOLD) return;
      dragged.current = true;
      const next = clampFab(origin.current.x + gesture.dx, origin.current.y + gesture.dy, bounds);
      current.current = next; position.setValue(next);
    },
    onPanResponderRelease: () => {
      if (!dragged.current) { setOpen(value => !value); return; }
      const next = snapFab(current.current.x, current.current.y, bounds);
      current.current = next; setSide(next.side);
      savedPosition.current = normalizedFab(next.side, next.y, bounds);
      Animated.spring(position, { toValue: next, useNativeDriver: false, damping: 18, stiffness: 190 }).start();
      void saveFabPosition(savedPosition.current);
    },
    onPanResponderTerminate: () => {
      const next = snapFab(current.current.x, current.current.y, bounds); current.current = next; position.setValue(next);
    },
  }), [bounds, position]);

  const expandBelow = current.current.y < bounds.minY + 150;
  const actionStyle = expandBelow ? styles.actionsBelow : styles.actionsAbove;
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={event => setLayout(event.nativeEvent.layout)}>
    {open ? <Pressable accessibilityLabel="Đóng tùy chọn ảnh" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} /> : null}
    {restored ? <Animated.View ref={targetRef} collapsable={false} testID="tutorial-target-diagnosis" style={[styles.floating, { transform: position.getTranslateTransform() }]}>
      {open ? <View testID="camera-speed-dial" style={[styles.actions, actionStyle, side === 'left' ? styles.alignLeft : styles.alignRight]}>
        <Quick testID="fab-tips-option" icon="information-circle-outline" label="Mẹo chụp ảnh rõ" onPress={() => { setOpen(false); setTips(true); }} />
        <Quick testID="fab-gallery-option" icon="images-outline" label="Chọn từ thư viện" onPress={() => { setOpen(false); onGallery(); }} />
        <Quick testID="fab-camera-option" icon="camera-outline" label="Chụp ảnh" onPress={() => { setOpen(false); onCamera(); }} />
      </View> : null}
      <Animated.View testID="diagnosis-toggle" {...panResponder.panHandlers} style={styles.pill} accessibilityRole="button" accessibilityLabel="Chẩn đoán ảnh, có thể kéo để di chuyển">
        <Ionicons name="camera" size={21} color="#fff" /><Text style={styles.label}>Chẩn đoán ảnh</Text>
      </Animated.View>
    </Animated.View> : null}
    <Modal visible={tips} transparent animationType="fade" onRequestClose={() => setTips(false)}>
      <Pressable style={styles.modalOverlay} onPress={() => setTips(false)}><Pressable style={styles.tipCard} onPress={() => undefined}>
        <Text style={styles.tipTitle}>Mẹo chụp ảnh rõ</Text>
        {['Chụp nơi đủ sáng','Lấy nét vào vùng có triệu chứng','Để lá/cành chiếm phần lớn khung hình','Tránh ảnh rung hoặc quá mờ','Có thể chụp thêm góc khác nếu triệu chứng không rõ'].map(tip => <View key={tip} style={styles.tipRow}><Ionicons name="checkmark-circle" size={18} color={colors.primary}/><Text style={styles.tipText}>{tip}</Text></View>)}
        <Pressable accessibilityRole="button" onPress={() => setTips(false)} style={styles.gotIt}><Text style={styles.gotItText}>Đã hiểu</Text></Pressable>
      </Pressable></Pressable>
    </Modal>
  </View>;
}

function Quick({ testID, icon, label, onPress }: { testID: string; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={styles.quick}><Ionicons name={icon} size={19} color={colors.primaryDark}/><Text style={styles.quickText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  floating: { position: 'absolute', width: WIDTH, height: HEIGHT, zIndex: 30, elevation: 12 },
  pill: { width: WIDTH, height: HEIGHT, paddingHorizontal: 16, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderWidth: 1, borderColor: '#83BE99', shadowColor: '#143725', shadowOpacity: .22, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 10 },
  label: { color: '#fff', fontSize: 14, fontWeight: '900' },
  actions: { position: 'absolute', gap: 8, width: 178, zIndex: 31 }, actionsAbove: { bottom: HEIGHT + 9 }, actionsBelow: { top: HEIGHT + 9 }, alignLeft: { left: 0 }, alignRight: { right: 0 },
  quick: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: '#13291c', shadowOpacity: .14, shadowRadius: 7, elevation: 7 }, quickText: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(12,24,17,.48)' }, tipCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: 12 }, tipTitle: { color: colors.primaryDark, fontSize: 20, fontWeight: '900', marginBottom: 2 }, tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, tipText: { flex: 1, color: colors.text, lineHeight: 20 }, gotIt: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary, marginTop: 4 }, gotItText: { color: '#fff', fontWeight: '900' },
});
