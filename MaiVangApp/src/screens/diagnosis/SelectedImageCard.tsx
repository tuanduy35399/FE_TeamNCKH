import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../theme';
import type { SelectedImage } from '../../types/domain';

export function SelectedImageCard({ image, onReplace, onRemove }: { image: SelectedImage; onReplace: () => void; onRemove: () => void }) {
  const [failed, setFailed] = useState(false);
  return <View style={styles.card} testID="selected-image-card">
    <View style={styles.preview}>
      {failed
        ? <View style={styles.fallback}><Ionicons name="image-outline" size={36} color={colors.muted} /><Text style={styles.fallbackText}>Không thể hiển thị ảnh này.</Text></View>
        : <Image source={{ uri: image.uri }} resizeMode="contain" onError={() => setFailed(true)} style={styles.image} />}
      <View style={styles.badge}><Ionicons name="checkmark-circle" size={16} color={colors.primary} /><Text style={styles.badgeText}>Ảnh đã chọn</Text></View>
    </View>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Thay ảnh" onPress={onReplace} style={styles.action}><Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} /><Text style={styles.replace}>Thay ảnh</Text></Pressable>
      <Pressable testID="remove-image" accessibilityRole="button" accessibilityLabel="Xóa ảnh" onPress={onRemove} style={styles.action}><Ionicons name="trash-outline" size={19} color={colors.danger} /><Text style={styles.remove}>Xóa</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  preview: { height: 220, position: 'relative', backgroundColor: colors.primarySoft }, image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', left: 12, top: 12, minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,.94)' },
  badgeText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 }, fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }, fallbackText: { color: colors.muted },
  actions: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }, action: { minWidth: 112, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  replace: { color: colors.primary, fontWeight: '800' }, remove: { color: colors.danger, fontWeight: '800' },
});
