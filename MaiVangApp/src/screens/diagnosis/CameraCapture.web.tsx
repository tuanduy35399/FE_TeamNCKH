import { createElement, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme';
import type { SelectedImage } from '../../types/domain';

export function CameraCapture({ visible, onCancel, onCaptured, onLibrary }: { visible: boolean; onCancel: () => void; onCaptured: (image: SelectedImage) => void; onLibrary: () => void }) {
  const videoRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!visible) return;
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { setError('Không tìm thấy camera trên thiết bị này.'); return; }
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(stream => {
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); }
    }).catch(() => setError('Không tìm thấy camera trên thiết bị này.'));
    return stop;
  }, [visible]);
  function stop() { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; }
  function close() { stop(); onCancel(); }
  function capture() {
    const video = videoRef.current as HTMLVideoElement | null;
    if (!video?.videoWidth) { setError('Camera chưa sẵn sàng. Vui lòng thử lại.'); return; }
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0); const uri = canvas.toDataURL('image/jpeg', 0.86);
    stop(); onCaptured({ uri, name: `mai-${Date.now()}.jpg`, mimeType: 'image/jpeg' });
  }
  return <Modal visible={visible} animationType="fade" onRequestClose={close}><View style={styles.screen}>
    <View style={styles.top}><Pressable accessibilityRole="button" accessibilityLabel="Đóng camera" onPress={close} style={styles.close}><Ionicons name="close" size={28} color="#fff" /></Pressable><Text style={styles.guide}>Đặt lá mai trong khung hình</Text><View style={styles.spacer} /></View>
    <View style={styles.viewport}>{!error && createElement('video', { ref: videoRef, autoPlay: true, muted: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'cover' } })}{!!error && <View style={styles.fallback}><Ionicons name="camera-outline" size={52} color="#C9D2CC" /><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { stop(); onLibrary(); }} style={styles.library}><Text style={styles.libraryText}>Chọn ảnh từ thư viện</Text></Pressable></View>}<View pointerEvents="none" style={styles.frame} /></View>
    <View style={styles.bottom}>{!error && <Pressable testID="camera-shutter" accessibilityRole="button" accessibilityLabel="Chụp ảnh" onPress={capture} style={styles.shutterOuter}><View style={styles.shutterInner} /></Pressable>}</View>
  </View></Modal>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#07100B' }, top: { minHeight: 86, paddingTop: 24, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, guide: { flex: 1, color: '#fff', fontWeight: '700', textAlign: 'center' }, spacer: { width: 48 }, viewport: { flex: 1, overflow: 'hidden', backgroundColor: '#101A14', position: 'relative' }, frame: { position: 'absolute', left: 28, right: 28, top: 50, bottom: 50, borderWidth: 2, borderColor: 'rgba(255,255,255,.8)', borderRadius: 24 }, fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md }, error: { color: '#fff', textAlign: 'center', lineHeight: 22 }, library: { minHeight: 48, borderRadius: 14, backgroundColor: colors.surface, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' }, libraryText: { color: colors.primaryDark, fontWeight: '800' }, bottom: { height: 132, alignItems: 'center', justifyContent: 'center' }, shutterOuter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }, shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' } });
