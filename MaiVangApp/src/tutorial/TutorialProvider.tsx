import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren, type RefObject } from 'react';
import { ActivityIndicator, Dimensions, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { TutorialTargetRegistry, tutorialSteps, type TutorialTargetName } from './model';
import { isTutorialCompleted, saveTutorialCompleted } from './storage';

type Target = { ref: RefObject<View | null>; ensureVisible?: () => void };
type Rect = { x: number; y: number; width: number; height: number };
type TutorialContextValue = { registerTarget: (name: TutorialTargetName, target: Target) => () => void; replay: () => void };
const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: PropsWithChildren) {
  const targets = useRef(new TutorialTargetRegistry<Target>());
  const [targetVersion, setTargetVersion] = useState(0);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [screen, setScreen] = useState(Dimensions.get('window'));

  useEffect(() => { let mounted = true; void isTutorialCompleted().then(done => { if (mounted && !done) { setStep(0); setActive(true); } }); return () => { mounted = false; }; }, []);
  const measure = useCallback(() => {
    if (!active) { setRect(null); return; }
    const name = tutorialSteps[step]?.target; const target = name ? targets.current.get(name) : undefined;
    target?.ensureVisible?.();
    const timer = setTimeout(() => {
      const node = target?.ref.current as any;
      const webNode = Platform.OS === 'web' ? globalThis.document?.querySelector(`[data-testid="tutorial-target-${name}"]`) as any : null;
      if (webNode?.getBoundingClientRect) {
        const box = webNode.getBoundingClientRect(); if (box.width > 0 && box.height > 0) setRect({ x: box.left, y: box.top, width: box.width, height: box.height });
      } else node?.measureInWindow((x: number, y: number, width: number, height: number) => { if (width > 0 && height > 0) setRect({ x, y, width, height }); });
    }, 180);
    return () => clearTimeout(timer);
  }, [active, step, targetVersion]);
  useEffect(() => measure(), [measure]);
  useEffect(() => { const subscription = Dimensions.addEventListener('change', ({ window }) => { setScreen(window); setTimeout(measure, 80); }); return () => subscription.remove(); }, [measure]);
  const close = useCallback(async () => { await saveTutorialCompleted(); setActive(false); setRect(null); }, []);
  const value = useMemo<TutorialContextValue>(() => ({
    registerTarget: (name, target) => { const cleanup = targets.current.register(name, target); setTargetVersion(value => value + 1); return () => { cleanup(); setTargetVersion(value => value + 1); }; },
    replay: () => { setRect(null); setStep(0); setActive(true); },
  }), []);
  return <TutorialContext.Provider value={value}>{children}<TutorialOverlay active={active} step={step} rect={rect} screen={screen} next={() => step === tutorialSteps.length - 1 ? void close() : (setRect(null), setStep(value => value + 1))} back={() => { setRect(null); setStep(value => Math.max(0, value - 1)); }} skip={() => void close()} /></TutorialContext.Provider>;
}

export function useTutorial() { const value = useContext(TutorialContext); if (!value) throw new Error('useTutorial must be used inside TutorialProvider'); return value; }

function TutorialOverlay({ active, step, rect, screen, next, back, skip }: { active: boolean; step: number; rect: Rect | null; screen: { width: number; height: number }; next: () => void; back: () => void; skip: () => void }) {
  if (!active) return null;
  if (!rect) return <Modal visible transparent statusBarTranslucent><View testID="tutorial-overlay" style={styles.layer}><View style={[styles.shade, StyleSheet.absoluteFill]} /><ActivityIndicator accessibilityLabel="Đang mở hướng dẫn" size="large" color={colors.accent} style={styles.preparing} /></View></Modal>;
  const current = tutorialSteps[step]!; const padding = 7;
  const targetHeight = current.target === 'messageArea' ? Math.min(rect.height, 170) : rect.height;
  const focus = { x: Math.max(8, rect.x - padding), y: Math.max(8, rect.y - padding), width: Math.min(screen.width - 16, rect.width + padding * 2), height: targetHeight + padding * 2 };
  const tooltipWidth = Math.min(354, screen.width - 24); const tooltipHeight = screen.height < 680 ? 224 : 208;
  const below = focus.y + focus.height + 12; const preferred = below + tooltipHeight <= screen.height - 10 ? below : focus.y - tooltipHeight - 12;
  const tooltipTop = Math.max(10, Math.min(preferred, screen.height - tooltipHeight - 10));
  const spotlight = <>
    <View style={[styles.shade, { left: 0, top: 0, right: 0, height: focus.y }]} /><View style={[styles.shade, { left: 0, top: focus.y, width: focus.x, height: focus.height }]} />
    <View style={[styles.shade, { left: focus.x + focus.width, right: 0, top: focus.y, height: focus.height }]} /><View style={[styles.shade, { left: 0, right: 0, top: focus.y + focus.height, bottom: 0 }]} />
    <View testID="tutorial-focus" pointerEvents="none" style={[styles.focus, { left: focus.x, top: focus.y, width: focus.width, height: focus.height }]} />
  </>;
  const tooltip = <View testID="tutorial-tooltip" accessibilityViewIsModal accessibilityLabel={`${current.title}. ${current.text}`} style={[styles.tooltip, { width: tooltipWidth, top: tooltipTop, left: (screen.width - tooltipWidth) / 2 }]}>
    <Text style={styles.count}>{step + 1} / {tutorialSteps.length}</Text><Text style={styles.title}>{current.title}</Text><Text style={styles.text}>{current.text}</Text>
    {step === tutorialSteps.length - 1 && <Text style={styles.ready}>Bạn đã sẵn sàng sử dụng MaiCare AI.</Text>}
    <View style={styles.actions}><Pressable accessibilityRole="button" accessibilityLabel="Bỏ qua hướng dẫn" onPress={skip} style={styles.skip}><Text style={styles.skipText}>Bỏ qua</Text></Pressable><View style={styles.navActions}>{step > 0 && <Pressable accessibilityRole="button" onPress={back} style={styles.back}><Text style={styles.backText}>Quay lại</Text></Pressable>}<Pressable testID="tutorial-next" accessibilityRole="button" onPress={next} style={styles.next}><Text style={styles.nextText}>{step === tutorialSteps.length - 1 ? 'Bắt đầu' : 'Tiếp'}</Text></Pressable></View></View>
  </View>;
  return <Modal visible transparent animationType="fade" onRequestClose={skip} statusBarTranslucent><View testID="tutorial-overlay" style={styles.layer}>{spotlight}{tooltip}</View></Modal>;
}

const styles = StyleSheet.create({
  layer: { flex: 1 }, shade: { position: 'absolute', backgroundColor: 'rgba(8, 20, 13, 0.78)' }, preparing: { position: 'absolute', alignSelf: 'center', top: '46%' }, focus: { position: 'absolute', borderWidth: 3, borderColor: colors.accent, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.10)' },
  tooltip: { position: 'absolute', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...(Platform.OS === 'web' ? { boxShadow: '0 12px 36px rgba(0,0,0,.3)' } : { elevation: 12 }) }, count: { color: colors.primary, fontWeight: '900', fontSize: 12 }, title: { color: colors.text, fontSize: 19, fontWeight: '900' }, text: { color: colors.muted, lineHeight: 21 }, ready: { color: colors.primaryDark, fontWeight: '800' },
  actions: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, navActions: { flexDirection: 'row', gap: 8 }, skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }, skipText: { color: colors.muted, fontWeight: '700' }, back: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }, backText: { color: colors.primaryDark, fontWeight: '700' }, next: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.primary }, nextText: { color: colors.surface, fontWeight: '900' },
});
