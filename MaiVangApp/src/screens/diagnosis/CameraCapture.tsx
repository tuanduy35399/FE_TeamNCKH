import { useEffect, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme';
import type { SelectedImage } from '../../types/domain';

export function CameraCapture({ visible, onCancel, onCaptured, onLibrary }: {
  visible: boolean; onCancel: () => void; onCaptured: (image: SelectedImage) => void; onLibrary: () => void;
}) {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) { setReady(false); setBusy(false); setError(''); return; }
    void requestPermission().catch(() => setError('MaiCare chưa thể mở camera lúc này.'));
  }, [visible]);

  async function capture() {
    if (!ready || busy) return;
    setBusy(true); setError('');
    try {
      const picture = await camera.current?.takePictureAsync({ quality: 0.86 });
      if (!picture?.uri) throw new Error('capture unavailable');
      onCaptured({ uri: picture.uri, name: `mai-${Date.now()}.jpg`, mimeType: 'image/jpeg' });
    } catch {
      setError('MaiCare chưa thể chụp ảnh lúc này. Vui lòng thử lại.');
    } finally { setBusy(false); }
  }

  const denied = permission && !permission.granted;
  return <Modal visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
    <View style={styles.screen}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng camera" onPress={onCancel} style={styles.close}><Ionicons name="close" size={28} color="#fff" /></Pressable>
        <Text style={styles.guide}>Đặt lá mai trong khung hình</Text><View style={styles.spacer} />
      </View>
      <View style={styles.viewport}>
        {permission?.granted ? <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} /> : null}
        {!permission && <View style={styles.fallback}><ActivityIndicator size="large" color="#fff" /><Text style={styles.fallbackText}>Đang mở camera...</Text></View>}
        {denied && <View style={styles.fallback}><Ionicons name="camera-outline" size={52} color="#C9D2CC" /><Text accessibilityRole="alert" style={styles.fallbackText}>MaiCare cần quyền truy cập camera để chụp ảnh lá mai.</Text>
          <Pressable accessibilityRole="button" onPress={() => permission.canAskAgain ? void requestPermission() : void Linking.openSettings()} style={styles.library}><Text style={styles.libraryText}>{permission.canAskAgain ? 'Thử lại' : 'Mở cài đặt'}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={onLibrary} style={styles.library}><Text style={styles.libraryText}>Chọn ảnh từ thư viện</Text></Pressable>
        </View>}
        {!!error && permission?.granted && <View style={styles.errorBanner}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text></View>}
        {permission?.granted && <View pointerEvents="none" style={styles.frame} />}
      </View>
      <View style={styles.bottom}>
        {permission?.granted && <Pressable testID="camera-shutter" accessibilityRole="button" accessibilityLabel="Chụp ảnh" accessibilityState={{ disabled: !ready || busy }} disabled={!ready || busy} onPress={() => void capture()} style={[styles.shutterOuter, (!ready || busy) && styles.disabled]}>{busy ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}</Pressable>}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07100B' }, top: { minHeight: 90, paddingTop: 28, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, guide: { flex: 1, color: '#fff', fontWeight: '700', textAlign: 'center' }, spacer: { width: 48 },
  viewport: { flex: 1, overflow: 'hidden', backgroundColor: '#101A14', position: 'relative' }, frame: { position: 'absolute', left: 28, right: 28, top: 50, bottom: 50, borderWidth: 2, borderColor: 'rgba(255,255,255,.8)', borderRadius: 24 },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md }, fallbackText: { color: '#fff', textAlign: 'center', lineHeight: 22 },
  library: { minHeight: 48, borderRadius: 14, backgroundColor: colors.surface, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' }, libraryText: { color: colors.primaryDark, fontWeight: '800' },
  errorBanner: { position: 'absolute', left: 18, right: 18, bottom: 18, padding: 12, borderRadius: 12, backgroundColor: 'rgba(168,58,53,.94)' }, errorText: { color: '#fff', textAlign: 'center' },
  bottom: { height: 132, alignItems: 'center', justifyContent: 'center' }, shutterOuter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }, shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' }, disabled: { opacity: .48 },
});
