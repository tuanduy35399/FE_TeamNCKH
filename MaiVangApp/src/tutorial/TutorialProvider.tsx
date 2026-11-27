import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type PropsWithChildren, type RefObject } from 'react';
import { AppState, BackHandler, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';
import { TutorialTargetRegistry, tutorialSteps, type TutorialTargetName } from './model';
import { isTutorialCompleted, saveTutorialCompleted } from './storage';
import { intersection, isCurrentMeasurement, placeTooltip, relativeTo, safeBounds, shadeRects, spotlight, validRect, type Rect } from './tutorialGeometry';

type ViewRef = RefObject<ComponentRef<typeof View> | null>;
type Target = { ref: ViewRef; clip?: ViewRef };
type TutorialContextValue = {
  registerTarget: (name: TutorialTargetName, target: Target) => () => void;
  targetLayoutChanged: () => void;
  setChatReady: (ready: boolean) => void;
  replay: () => void;
};
const TutorialContext = createContext<TutorialContextValue | null>(null);
const web = Platform.OS === 'web';

type Tour = { session: number; step: number };
export function TutorialProvider({ children }: PropsWithChildren) {
  const targets = useRef(new TutorialTargetRegistry<Target>()).current;
  const notify = useRef<() => void>(undefined);
  const sequence = useRef(0);
  const background = useRef<ComponentRef<typeof View>>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [chatReady, setChatReady] = useState(false);
  const active = tour !== null;

  const replay = useCallback(() => {
    Keyboard.dismiss();
    if (web && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setTour({ session: ++sequence.current, step: 0 });
  }, []);
  useEffect(() => {
    let mounted = true;
    void isTutorialCompleted().then(done => {
      if (mounted && !done && sequence.current === 0) replay();
    });
    return () => { mounted = false; };
  }, [replay]);
  const close = useCallback(() => {
    setTour(null);
    void saveTutorialCompleted();
  }, []);
  useLayoutEffect(() => {
    if (!active || !web) return;
    const node = background.current as unknown as HTMLElement;
    node.inert = true;
    return () => { node.inert = false; };
  }, [active]);
  useEffect(() => {
    if (!active) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    const keyboard = Keyboard.addListener('keyboardDidShow', () => Keyboard.dismiss());
    return () => { back.remove(); keyboard.remove(); };
  }, [active, close]);

  const value = useMemo<TutorialContextValue>(() => ({
    registerTarget: (name, target) => {
      const unregister = targets.register(name, target);
      notify.current?.();
      return () => { unregister(); notify.current?.(); };
    },
    targetLayoutChanged: () => notify.current?.(),
    setChatReady,
    replay,
  }), [replay, targets]);

  const move = (direction: number) => {
    if (!tour) return;
    if (direction > 0 && tour.step === tutorialSteps.length - 1) { close(); return; }
    setTour(current => current === tour ? { ...current, step: Math.max(0, current.step + direction) } : current);
  };
  return <TutorialContext.Provider value={value}>
    <View style={styles.root}>
      <View ref={background} style={styles.root} pointerEvents={active ? 'none' : 'auto'}
        accessibilityElementsHidden={active} importantForAccessibility={active ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      {tour && <TutorialOverlay key={tour.session} step={tour.step} chatReady={chatReady}
        targets={targets} notify={notify} next={() => move(1)} back={() => move(-1)} skip={close} />}
    </View>
  </TutorialContext.Provider>;
}

export function useTutorial() {
  const value = useContext(TutorialContext);
  if (!value) throw new Error('useTutorial must be used inside TutorialProvider');
  return value;
}

export function useTutorialTarget(name: TutorialTargetName, ref: ViewRef, clip?: ViewRef) {
  const { registerTarget, targetLayoutChanged } = useTutorial();
  useLayoutEffect(() => registerTarget(name, { ref, clip }), [registerTarget, name, ref, clip]);
  return targetLayoutChanged;
}

function dom(ref: ViewRef) { return ref.current as unknown as HTMLElement | null; }

function readRect(ref: ViewRef, done: (rect: Rect | null) => void) {
  if (web) {
    const element = dom(ref);
    if (!element?.isConnected || !element.getClientRects().length || getComputedStyle(element).visibility !== 'visible') {
      done(null);
      return;
    }
    const { left, top, width, height } = element.getBoundingClientRect();
    done({ x: left, y: top, width, height });
    return;
  }
  if (!ref.current) { done(null); return; }
  ref.current.measureInWindow((x, y, width, height) => done({ x, y, width, height }));
}

type Geometry = { bounds: Rect; safe: Rect; focus: Rect | null };
function useSpotlight(step: number, ready: boolean, root: ViewRef, targets: TutorialTargetRegistry<Target>, notify: RefObject<(() => void) | undefined>) {
  const { width, height, fontScale } = useWindowDimensions();
  const { left, top, right, bottom } = useSafeAreaInsets();
  const [geometry, setGeometry] = useState<(Geometry & { step: number }) | null>(null);
  const [failedStep, setFailedStep] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);

  useLayoutEffect(() => {
    const name = tutorialSteps[step]!.target;
    const viewport = web ? window.visualViewport : null;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;
    let observed = new Set<HTMLElement>();
    let attempts = 0;
    let settleUntil = 0;
    let disposed = false;

    const schedule = () => {
      if (disposed) return;
      generation.current++;
      clearTimeout(timer);
      clearTimeout(deadline);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const invalidate = () => { attempts = 0; schedule(); };

    function measure() {
      const request = generation.current;
      const current = () => !disposed && isCurrentMeasurement(request, generation.current);
      const candidates = targets.getAll(name);
      if (observer) {
        const elements = new Set([dom(root), ...candidates.flatMap(target => [dom(target.ref), target.clip && dom(target.clip)])]
          .filter((node): node is HTMLElement => !!node));
        for (const node of observed) if (!elements.has(node)) observer.unobserve(node);
        for (const node of elements) if (!observed.has(node)) observer.observe(node);
        observed = elements;
      }
      let resolved = false;
      const publish = (value: Geometry | null) => {
        if (!current() || resolved) return;
        resolved = true;
        clearTimeout(deadline);
        if (value) setGeometry(previous => {
          if (!current()) return previous;
          const next = { ...value, step };
          return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
        });
        if (value?.focus) {
          attempts = 0;
          setFailedStep(null);
          // A keyboard transition can translate the tab bar without a child layout event.
          if (Date.now() < settleUntil) timer = setTimeout(schedule, 80);
          return;
        }
        if (++attempts >= 20) { setFailedStep(step); return; }
        timer = setTimeout(schedule, 80);
      };
      // Native measurement callbacks may be dropped when views detach mid-layout.
      deadline = setTimeout(() => publish(null), 100);
      readRect(root, origin => {
        if (!current() || !origin || !validRect(origin)) { publish(null); return; }
        const bounds = { x: 0, y: 0, width: origin.width, height: origin.height };
        const visible = viewport ? intersection(bounds, relativeTo({
          x: viewport.offsetLeft, y: viewport.offsetTop, width: viewport.width, height: viewport.height,
        }, origin)) : bounds;
        const allowed = visible && safeBounds(visible, { left, top, right, bottom });
        if (!allowed) { publish(null); return; }
        const finish = (focus: Rect | null) => publish({ bounds, safe: allowed, focus });
        if (!ready || ((name === 'history' || name === 'account') && Keyboard.isVisible())) { finish(null); return; }
        if (!candidates.length) { finish(null); return; }

        // Several mounted list rows can qualify. Pick the topmost substantially
        // visible row, using a clipped row if only a tall/partial row is on screen.
        let pending = candidates.length;
        const matches: { focus: Rect; visibleHeight: number }[] = [];
        candidates.forEach(({ ref, clip }) => {
          const collect = (target: Rect | null, clipping: Rect | null) => {
            if (!current() || resolved) return;
            if (target && clipping) {
              const limits = intersection(allowed, clipping);
              const local = relativeTo(target, origin);
              const visibleTarget = limits && intersection(local, limits);
              const focus = limits && spotlight(local, limits);
              if (visibleTarget && focus) matches.push({ focus, visibleHeight: visibleTarget.height });
            }
            if (--pending === 0) {
              matches.sort((a, b) => Number(b.visibleHeight >= 32) - Number(a.visibleHeight >= 32) || a.focus.y - b.focus.y);
              finish(matches[0]?.focus ?? null);
            }
          };
          readRect(ref, target => {
            if (target && clip) readRect(clip, clipping => collect(target, clipping && relativeTo(clipping, origin)));
            else collect(target, allowed);
          });
        });
      });
    }

    notify.current = invalidate;
    if (web && typeof ResizeObserver !== 'undefined') observer = new ResizeObserver(invalidate);
    if (web) window.addEventListener('scroll', invalidate, true);
    viewport?.addEventListener('resize', invalidate);
    viewport?.addEventListener('scroll', invalidate);
    const keyboardChanged = () => {
      settleUntil = Date.now() + 450;
      invalidate();
    };
    const show = Keyboard.addListener('keyboardDidShow', keyboardChanged);
    const hide = Keyboard.addListener('keyboardDidHide', keyboardChanged);
    const app = AppState.addEventListener('change', state => { if (state === 'active') invalidate(); });
    setFailedStep(null);
    schedule();
    return () => {
      disposed = true;
      generation.current++;
      notify.current = undefined;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      clearTimeout(deadline);
      observer?.disconnect();
      if (web) window.removeEventListener('scroll', invalidate, true);
      viewport?.removeEventListener('resize', invalidate);
      viewport?.removeEventListener('scroll', invalidate);
      show.remove(); hide.remove(); app.remove();
    };
  }, [step, ready, root, targets, notify, width, height, fontScale, left, top, right, bottom, retry]);

  return {
    geometry,
    focus: geometry?.step === step && ready ? geometry.focus : null,
    failed: failedStep === step,
    retryMeasurement: () => setRetry(value => value + 1),
  };
}

function TutorialOverlay({ step, chatReady, targets, notify, next, back, skip }: {
  step: number; chatReady: boolean; targets: TutorialTargetRegistry<Target>;
  notify: RefObject<(() => void) | undefined>; next: () => void; back: () => void; skip: () => void;
}) {
  const root = useRef<ComponentRef<typeof View>>(null);
  const { geometry, focus, failed, retryMeasurement } = useSpotlight(step, chatReady, root, targets, notify);

  useEffect(() => {
    if (!web) return;
    const node = dom(root)!;
    node.focus({ preventScroll: true });
    const guard = (event: FocusEvent) => {
      if (!node.contains(event.target as Node)) node.focus({ preventScroll: true });
    };
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); skip(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...node.querySelectorAll<HTMLElement>('[role="button"][tabindex="0"]')].filter(control => control.getClientRects().length);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) { event.preventDefault(); return; }
      const focused = document.activeElement;
      if (!controls.includes(focused as HTMLElement) || focused === (event.shiftKey ? first : last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('focusin', guard);
    node.addEventListener('keydown', keys);
    return () => {
      document.removeEventListener('focusin', guard);
      node.removeEventListener('keydown', keys);
    };
  }, [skip, step]);

  return <View ref={root} collapsable={false} testID="tutorial-overlay"
    role={web ? 'dialog' : undefined} aria-modal={web ? true : undefined}
    tabIndex={web ? -1 : undefined} accessibilityViewIsModal accessibilityLabel="Hướng dẫn sử dụng MaiCare"
    onLayout={() => notify.current?.()} style={styles.layer}>
    <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}>
      {focus && geometry ? <>
        {shadeRects(geometry.bounds, focus).map((rect, index) => <View key={index} style={[styles.shade, absolute(rect)]} />)}
        <View testID="tutorial-focus" style={[styles.focus, absolute(focus)]} />
      </> : <View style={[styles.shade, StyleSheet.absoluteFill]} />}
    </View>
    {geometry && <TutorialCard key={step} step={step} bounds={geometry.safe} focus={focus}
      failed={failed} retry={retryMeasurement} next={next} back={back} skip={skip} />}
    {!geometry && <View style={styles.emergency}><Pressable accessibilityRole="button" onPress={skip} style={styles.skip}>
      <Text style={styles.skipText}>Bỏ qua hướng dẫn</Text>
    </Pressable></View>}
  </View>;
}

const absolute = ({ x, y, width, height }: Rect) => ({ left: x, top: y, width, height });

function TutorialCard({ step, bounds, focus, failed, retry, next, back, skip }: {
  step: number; bounds: Rect; focus: Rect | null; failed: boolean;
  retry: () => void; next: () => void; back: () => void; skip: () => void;
}) {
  const [copyHeight, setCopyHeight] = useState(0);
  const [actionsHeight, setActionsHeight] = useState(0);
  const margin = Math.min(10, bounds.width / 10, bounds.height / 10);
  const inner = safeBounds(bounds, { left: margin, right: margin, top: margin, bottom: margin });
  const width = Math.min(354, inner.width);
  const height = copyHeight + actionsHeight;
  const position = placeTooltip(inner, focus, { width, height: height || inner.height }, actionsHeight + 52);
  const current = tutorialSteps[step]!;
  const copyStyle = [styles.copy, bounds.height < 420 && styles.compactCopy];
  const copy = <>
    <Text style={styles.count}>{step + 1} / {tutorialSteps.length}</Text>
    <Text accessibilityRole="header" style={styles.title}>{current.title}</Text>
    <Text style={styles.text}>{current.text}</Text>
    {step === tutorialSteps.length - 1 && <Text style={styles.ready}>Bạn đã sẵn sàng sử dụng MaiCare AI.</Text>}
    {!focus && <Text accessibilityLiveRegion="polite" testID={failed ? 'tutorial-unavailable' : 'tutorial-preparing'} style={styles.text}>
      {failed ? 'Chưa thể hiển thị vị trí của chức năng này.' : 'Đang tìm vị trí trên màn hình…'}
    </Text>}
  </>;
  const actions = <View style={styles.actions} onLayout={event => setActionsHeight(event.nativeEvent.layout.height)}>
    <Pressable testID="tutorial-skip" accessibilityRole="button" accessibilityLabel="Bỏ qua hướng dẫn" onPress={skip} style={styles.skip}><Text style={styles.skipText}>Bỏ qua</Text></Pressable>
    {failed && !focus && <Pressable accessibilityRole="button" onPress={retry} style={styles.back}><Text style={styles.backText}>Thử lại</Text></Pressable>}
    {step > 0 && <Pressable testID="tutorial-back" accessibilityRole="button" onPress={back} style={styles.back}><Text style={styles.backText}>Quay lại</Text></Pressable>}
    <Pressable testID="tutorial-next" accessibilityRole="button" onPress={next} style={styles.next}><Text style={styles.nextText}>{step === tutorialSteps.length - 1 ? 'Bắt đầu' : 'Tiếp'}</Text></Pressable>
  </View>;
  return <View testID="tutorial-tooltip" style={[styles.tooltip, absolute(position)]}>
    {actionsHeight >= position.height ? <ScrollView testID="tutorial-copy" style={styles.copyScroll}>
      <View style={copyStyle} onLayout={event => setCopyHeight(event.nativeEvent.layout.height)}>{copy}</View>
      {actions}
    </ScrollView> : <>
      <ScrollView testID="tutorial-copy" style={styles.copyScroll} contentContainerStyle={copyStyle}
        onContentSizeChange={(_, measured) => setCopyHeight(measured)}>{copy}</ScrollView>
      {actions}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 32 },
  shade: { position: 'absolute', backgroundColor: 'rgba(8, 20, 13, 0.78)' },
  focus: { position: 'absolute', borderWidth: 3, borderColor: colors.accent, borderRadius: radius.md },
  emergency: { position: 'absolute', alignSelf: 'center', top: '40%', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg },
  tooltip: { position: 'absolute', backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...(web ? { boxShadow: '0 12px 36px rgba(0,0,0,.3)' } : { elevation: 12 }) },
  copyScroll: { flex: 1, minHeight: 0 },
  copy: { padding: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  compactCopy: { padding: 10, paddingBottom: 6, gap: 5 },
  count: { color: colors.primary, fontWeight: '900', fontSize: 12 },
  title: { color: colors.text, fontSize: 19, fontWeight: '900' },
  text: { color: colors.muted, lineHeight: 21 },
  ready: { color: colors.primaryDark, fontWeight: '800' },
  actions: { flexShrink: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  skip: { minHeight: 44, minWidth: 44, marginRight: 'auto', justifyContent: 'center', paddingHorizontal: 4 },
  skipText: { color: colors.muted, fontWeight: '700' },
  back: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  backText: { color: colors.primaryDark, fontWeight: '700' },
  next: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.primary },
  nextText: { color: colors.surface, fontWeight: '900' },
});
