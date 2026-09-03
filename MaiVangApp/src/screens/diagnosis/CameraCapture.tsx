import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { colors, spacing } from '../../theme';
import type { SelectedImage } from '../../types/domain';

export function CameraCapture({ visible, onCancel, onCaptured, onLibrary }: { visible: boolean; onCancel: () => void; onCaptured: (image: SelectedImage) => void; onLibrary: () => void }) {
  const [error, setError] = useState('');
  useEffect(() => { if (!visible) return; void (async () => {
    setError('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { setError('Bạn chưa cấp quyền sử dụng camera.'); return; }
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (result.canceled) onCancel();
      else if (result.assets[0]) { const asset = result.assets[0]; onCaptured({ uri: asset.uri, name: asset.fileName || `mai-${Date.now()}.jpg`, mimeType: asset.mimeType, size: asset.fileSize }); }
    } catch { setError('Không tìm thấy camera trên thiết bị này.'); }
  })(); }, [visible]);
  return <Modal visible={visible && !!error} transparent animationType="fade" onRequestClose={onCancel}><View style={styles.center}><View style={styles.card}><Text style={styles.title}>Không thể mở camera</Text><Text style={styles.text}>{error}</Text><AppButton title="Chọn ảnh từ thư viện" onPress={onLibrary} /><AppButton title="Đóng" variant="secondary" onPress={onCancel} /></View></View></Modal>;
}
const styles = StyleSheet.create({ center: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(10,18,13,.74)' }, card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: 20, gap: spacing.md }, title: { color: colors.text, fontSize: 20, fontWeight: '800' }, text: { color: colors.muted, lineHeight: 21 } });
