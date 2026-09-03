import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren, type RefObject } from 'react';
import { ActivityIndicator, Dimensions, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { isTutorialCompleted, saveTutorialCompleted } from './storage';

type TargetName = 'image' | 'description' | 'submit' | 'history' | 'account';
type Target = { ref: RefObject<View>; ensureVisible?: () => void };
type Rect = { x: number; y: number; width: number; height: number };
type TutorialContextValue = {
  registerTarget: (name: TargetName, target: Target) => () => void;
  replay: () => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);
const steps: Array<{ target?: TargetName; title: string; text: string }> = [
  { title: 'Chào mừng bạn đến với MaiCare', text: 'MaiCare giúp bạn kiểm tra tình trạng lá mai và hỏi thêm về cách chăm sóc.' },
  { target: 'image', title: 'Thêm ảnh lá mai', text: 'Chụp ảnh mới hoặc chọn ảnh rõ, đủ sáng từ thiết bị. Ảnh giúp MaiCare kiểm tra tình trạng lá cụ thể hơn.' },
  { target: 'description', title: 'Mô tả thêm', text: 'Bạn có thể ghi những dấu hiệu đã quan sát, nhưng phần này không bắt buộc nếu bạn đã gửi ảnh.' },
  { target: 'submit', title: 'Kiểm tra hoặc đặt câu hỏi', text: 'Có ảnh: MaiCare sẽ kiểm tra ảnh. Chỉ có nội dung chữ: MaiCare sẽ trả lời như một trợ lý chăm sóc mai.' },
  { target: 'history', title: 'Xem lại', text: 'Khi hệ thống hỗ trợ lưu lịch sử, bạn có thể xem lại những lần kiểm tra và câu hỏi trước đây tại đây.' },
  { target: 'account', title: 'Tài khoản của bạn', text: 'Quản lý thông tin tài khoản, đăng xuất và mở lại hướng dẫn sử dụng khi cần.' },
];

export function TutorialProvider({ children }: PropsWithChildren) {
  const targets = useRef(new Map<TargetName, Target>());
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [screen, setScreen] = useState(Dimensions.get('window'));

  useEffect(() => { void isTutorialCompleted().then(done => { if (!done) { setStep(0); setActive(true); } }); }, []);

  const measure = useCallback(() => {
    if (!active || step === 0) { setRect(null); return; }
    const target = targets.current.get(steps[step]?.target as TargetName);
    target?.ensureVisible?.();
    const timer = setTimeout(() => {
      const node = target?.ref.current as any;
      const webIds: Record<TargetName, string> = { image: 'tutorial-target-image', description: 'tutorial-target-description', submit: 'tutorial-target-submit', history: 'tutorial-target-history', account: 'tutorial-target-account' };
      const webNode = Platform.OS === 'web' ? globalThis.document?.querySelector(`[data-testid="${webIds[steps[step]?.target as TargetName]}"]`) as any : null;
      if (webNode?.getBoundingClientRect) {
        const box = webNode.getBoundingClientRect();
        if (box.width > 0 && box.height > 0) setRect({ x: box.left, y: box.top, width: box.width, height: box.height });
      } else node?.measureInWindow((x: number, y: number, width: number, height: number) => { if (width > 0 && height > 0) setRect({ x, y, width, height }); });
    }, 180);
    return () => clearTimeout(timer);
  }, [active, step]);

  useEffect(() => measure(), [measure]);
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => { setScreen(window); setTimeout(measure, 80); });
    return () => subscription.remove();
  }, [measure]);

  const close = useCallback(async () => { await saveTutorialCompleted(); setActive(false); setRect(null); }, []);
  const next = () => { if (step === steps.length - 1) void close(); else { setRect(null); setStep(value => value + 1); } };
  const back = () => { setRect(null); setStep(value => Math.max(0, value - 1)); };
  const value = useMemo<TutorialContextValue>(() => ({
    registerTarget: (name, target) => { targets.current.set(name, target); return () => { if (targets.current.get(name) === target) targets.current.delete(name); }; },
    replay: () => { setRect(null); setStep(0); setActive(true); },
  }), []);

  return <TutorialContext.Provider value={value}>{children}
    <TutorialOverlay active={active} step={step} rect={rect} screen={screen} next={next} back={back} skip={() => void close()} />
  </TutorialContext.Provider>;
}

export function useTutorial() {
  const value = useContext(TutorialContext);
  if (!value) throw new Error('useTutorial must be used inside TutorialProvider');
  return value;
}

function TutorialOverlay({ active, step, rect, screen, next, back, skip }: { active: boolean; step: number; rect: Rect | null; screen: { width: number; height: number }; next: () => void; back: () => void; skip: () => void }) {
  if (!active) return null;
  if (step > 0 && !rect) return <Modal visible transparent animationType="none" statusBarTranslucent><View style={styles.layer}><View style={[styles.shade, StyleSheet.absoluteFill]} /><ActivityIndicator accessibilityLabel="Đang mở hướng dẫn" size="large" color={colors.accent} style={styles.preparing} /></View></Modal>;
  const current = steps[step]!;
  const gap = 8;
  const focus = rect ? { x: Math.max(8, rect.x - gap), y: Math.max(8, rect.y - gap), width: Math.min(screen.width - 16, rect.width + gap * 2), height: rect.height + gap * 2 } : null;
  const tooltipWidth = Math.min(350, screen.width - 24);
  const estimatedHeight = screen.height < 650 ? 210 : 195;
  const below = focus ? focus.y + focus.height + 12 : 0;
  const tooltipTop = focus
    ? (below + estimatedHeight < screen.height - 8 ? below : Math.max(8, focus.y - estimatedHeight - 12))
    : Math.max(24, (screen.height - 360) / 2);
  const spotlight = focus ? <>
        <View style={[styles.shade, { left: 0, top: 0, right: 0, height: focus.y }]} />
        <View style={[styles.shade, { left: 0, top: focus.y, width: focus.x, height: focus.height }]} />
        <View style={[styles.shade, { left: focus.x + focus.width, right: 0, top: focus.y, height: focus.height }]} />
        <View style={[styles.shade, { left: 0, right: 0, top: focus.y + focus.height, bottom: 0 }]} />
        <View testID="tutorial-focus" pointerEvents="none" style={[styles.focus, { left: focus.x, top: focus.y, width: focus.width, height: focus.height }]} />
      </> : <View style={[styles.shade, StyleSheet.absoluteFill]} />;
  const tooltip = <View testID="tutorial-tooltip" accessibilityViewIsModal style={[styles.tooltip, { width: tooltipWidth, top: tooltipTop, left: (screen.width - tooltipWidth) / 2 }]}>
        {step === 0 && <><View style={styles.brand}><Text style={styles.brandLeaf}>❧</Text><Text style={styles.brandName}>MaiCare</Text></View></>}
        <Text style={styles.count}>{step + 1} / {steps.length}</Text>
        <Text style={styles.title}>{current.title}</Text><Text style={styles.text}>{current.text}</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={skip} style={styles.skip}><Text style={styles.skipText}>Bỏ qua</Text></Pressable>
          <View style={styles.navActions}>{step > 0 && <Pressable accessibilityRole="button" onPress={back} style={styles.back}><Text style={styles.backText}>Quay lại</Text></Pressable>}
            <Pressable testID="tutorial-next" accessibilityRole="button" onPress={next} style={styles.next}><Text style={styles.nextText}>{step === 0 ? 'Bắt đầu' : step === steps.length - 1 ? 'Bắt đầu sử dụng' : 'Tiếp'}</Text></Pressable></View>
        </View>
      </View>;
  if (Platform.OS === 'web' && focus) return <>
    <Modal visible transparent animationType="fade" onRequestClose={skip}><View style={styles.layer}>{spotlight}</View></Modal>
    <Modal visible transparent animationType="none" onRequestClose={skip}><View pointerEvents="box-none" style={styles.layer} testID="tutorial-overlay">{tooltip}</View></Modal>
  </>;
  return <Modal visible transparent animationType="fade" onRequestClose={skip} statusBarTranslucent><View style={styles.layer} testID="tutorial-overlay">{spotlight}{tooltip}</View></Modal>;
}

const styles = StyleSheet.create({
  layer: { flex: 1 }, shade: { position: 'absolute', backgroundColor: colors.overlay }, preparing: { position: 'absolute', alignSelf: 'center', top: '46%' },
  focus: { position: 'absolute', borderWidth: 3, borderColor: colors.accent, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.08)' },
  tooltip: { position: 'absolute', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...(Platform.OS === 'web' ? { boxShadow: '0 12px 36px rgba(0,0,0,.3)' } : { elevation: 12 }) },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 }, brandLeaf: { color: colors.accent, fontSize: 29 }, brandName: { color: colors.primaryDark, fontSize: 23, fontWeight: '900' },
  count: { color: colors.primary, fontWeight: '800', fontSize: 12 }, title: { color: colors.text, fontSize: 19, fontWeight: '800' }, text: { color: colors.muted, lineHeight: 21 },
  actions: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, navActions: { flexDirection: 'row', gap: 8 },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }, skipText: { color: colors.muted, fontWeight: '700' },
  back: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }, backText: { color: colors.primaryDark, fontWeight: '700' },
  next: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 15, borderRadius: radius.md, backgroundColor: colors.primary }, nextText: { color: colors.surface, fontWeight: '800' },
});
