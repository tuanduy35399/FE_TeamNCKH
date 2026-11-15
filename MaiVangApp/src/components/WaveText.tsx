import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

export function WaveText({ children, animated = true }: { children: string; animated?: boolean }) {
  const phase = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduceMotion(value);
    }).catch(() => { /* Keep the text still if the preference is unavailable. */ });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (!animated || reduceMotion) return;
    const wave = Animated.loop(Animated.timing(phase, {
      toValue: 1,
      duration: 1800,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== 'web',
    }));
    wave.start();
    return () => { wave.stop(); phase.setValue(0); };
  }, [animated, phase, reduceMotion]);

  if (!animated || reduceMotion) return <Text testID="progress-text" accessibilityLiveRegion="polite" style={[styles.text, styles.container]}>{children}</Text>;

  return <View testID="progress-text" accessible accessibilityLabel={children} accessibilityLiveRegion="polite" style={styles.container}>
    <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.words}>
      {children.split(/(\s+)/).map((word, index) => {
        if (!word.trim()) return <Text key={index} style={styles.text}>{word}</Text>;
        const offsets = [0, 0.25, 0.5, 0.75, 1].map(step => Math.sin((step - index * 0.08) * Math.PI * 2));
        return <Animated.Text key={index} style={[styles.text, {
          opacity: phase.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: offsets.map(value => 0.82 + value * 0.18) }),
          transform: [{ translateY: phase.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: offsets.map(value => value * 1.25) }) }],
        }]}>{word}</Animated.Text>;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, minWidth: 0 },
  words: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 2 },
  text: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, flexShrink: 1 },
});
