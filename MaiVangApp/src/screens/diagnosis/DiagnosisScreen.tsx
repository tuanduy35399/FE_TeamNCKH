import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { submitDiagnosis } from '../../api/diagnosis';
import { ApiError } from '../../api/errors';
import { colors, radius, spacing } from '../../theme';
import type { DiagnosisResult as Result, SelectedImage } from '../../types/domain';
import { useTutorial } from '../../tutorial/TutorialProvider';
import { CameraCapture } from './CameraCapture';
import { CameraReview } from './CameraReview';
import { DiagnosisProcessing, type ProcessingMode } from './DiagnosisProcessing';
import { DiagnosisResult } from './DiagnosisResult';
import { ImageSourceSheet } from './ImageSourceSheet';
import { SelectedImageCard } from './SelectedImageCard';
import { AssistantConversation } from './AssistantConversation';
import { useAuth } from '../../auth/AuthProvider';
import { saveLocalImageHistory } from '../../history/imageHistory';

function toImage(asset: ImagePicker.ImagePickerAsset): SelectedImage {
  return { uri: asset.uri, name: asset.fileName || `mai-${Date.now()}.jpg`, mimeType: asset.mimeType, size: asset.fileSize, file: (asset as ImagePicker.ImagePickerAsset & { file?: Blob }).file };
}

export function DiagnosisScreen() {
  const { account } = useAuth();
  const [text, setText] = useState('');
  const [image, setImage] = useState<SelectedImage>();
  const [captured, setCaptured] = useState<SelectedImage>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pickerError, setPickerError] = useState('');
  const [libraryBlocked, setLibraryBlocked] = useState(false);
  const [processing, setProcessing] = useState<ProcessingMode>();
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result>();
  const [submittedText, setSubmittedText] = useState('');
  const [submittedMode, setSubmittedMode] = useState<ProcessingMode>();
  const scrollRef = useRef<ScrollView>(null);
  const imageRef = useRef<View>(null); const descriptionRef = useRef<View>(null); const submitRef = useRef<View>(null);
  const { registerTarget } = useTutorial();

  useEffect(() => {
    const cleanups = [
      registerTarget('image', { ref: imageRef, ensureVisible: () => scrollRef.current?.scrollTo({ y: 0, animated: true }) }),
      registerTarget('description', { ref: descriptionRef, ensureVisible: () => scrollRef.current?.scrollTo({ y: image ? 245 : 170, animated: true }) }),
      registerTarget('submit', { ref: submitRef, ensureVisible: () => scrollRef.current?.scrollToEnd({ animated: true }) }),
    ]; return () => cleanups.forEach(cleanup => cleanup());
  }, [registerTarget, image]);

  async function chooseLibrary() {
    setPickerError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setLibraryBlocked(!permission.canAskAgain);
        setPickerError('MaiCare cần quyền truy cập thư viện ảnh để bạn chọn ảnh.');
        return;
      }
      setLibraryBlocked(false);
      const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: .86 });
      if (!selection.canceled && selection.assets[0]) { setImage(toImage(selection.assets[0])); setResult(undefined); setError(''); }
      setSheetOpen(false); setCameraOpen(false);
    } catch { setPickerError('Không thể mở thư viện ảnh lúc này.'); }
  }
  function openCamera() { setSheetOpen(false); setPickerError(''); setCameraOpen(true); }
  function onCaptured(next: SelectedImage) { setCameraOpen(false); setCaptured(next); }
  function retake() { setCaptured(undefined); setCameraOpen(true); }
  function useCaptured() { if (captured) setImage(captured); setCaptured(undefined); setResult(undefined); setError(''); }

  async function submit() {
    const cleanText = text.trim(); if ((!image && !cleanText) || processing) return;
    const mode: ProcessingMode = image && cleanText ? 'combined' : image ? 'image' : 'text';
    setError(''); setProcessing(mode); setSubmittedText(cleanText); setSubmittedMode(mode);
    try {
      const next = await submitDiagnosis({ image, text: cleanText || undefined });
      if (image && account?.id) {
        await saveLocalImageHistory({
          userId: account.id,
          conversationId: next.conversationId,
          title: cleanText ? cleanText.slice(0, 120) : 'Kiểm tra ảnh lá mai',
          description: cleanText || undefined,
          detections: next.detections,
          image,
        }).catch(() => undefined);
      }
      setResult(next);
    }
    catch (value) { setError(value instanceof ApiError ? value.userMessage : 'Chưa thể kiểm tra lúc này. Vui lòng thử lại sau.'); }
    finally { setProcessing(undefined); }
  }
  function reset() { setImage(undefined); setText(''); setResult(undefined); setError(''); setSubmittedText(''); setSubmittedMode(undefined); scrollRef.current?.scrollTo({ y: 0, animated: true }); }

  const hasText = !!text.trim(); const enabled = !!image || hasText;
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.header}><View style={styles.brandMark}><Ionicons name="leaf" size={19} color={colors.primary} /></View><View style={styles.headerCopy}><Text style={styles.brand}>MaiCare</Text><Text style={styles.title}>Kiểm tra tình trạng mai</Text></View></View>
    <ScrollView ref={scrollRef} testID="diagnosis-screen" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!result ? <>
        <Text style={styles.intro}>Bạn có thể chỉ gửi ảnh. Thêm mô tả sẽ giúp kết quả phù hợp hơn. Nếu chưa có ảnh, bạn vẫn có thể hỏi MaiCare.</Text>
        <View ref={imageRef} testID="tutorial-target-image" collapsable={false}>{image ? <SelectedImageCard image={image} onReplace={() => setSheetOpen(true)} onRemove={() => { setImage(undefined); setError(''); }} /> : <UploadCard onPress={() => setSheetOpen(true)} />}</View>
        <Tips />
        <View ref={descriptionRef} testID="tutorial-target-description" collapsable={false} style={styles.field}><Text style={styles.label}>Mô tả thêm (không bắt buộc)</Text><TextInput testID="diagnosis-description" accessibilityLabel="Mô tả thêm" value={text} onChangeText={setText} multiline textAlignVertical="top" placeholder="Ví dụ: lá có đốm nâu, vàng mép, xuất hiện khoảng 3 ngày..." placeholderTextColor={colors.muted} style={styles.textarea} /></View>
        {hasText && !image && <View style={styles.info}><Ionicons name="information-circle-outline" size={18} color={colors.primary} /><Text style={styles.infoText}>Bạn đang hỏi thông tin chung. Thêm ảnh nếu muốn kiểm tra tình trạng lá cụ thể.</Text></View>}
        {!!error && <View accessibilityRole="alert" style={styles.error}><Ionicons name="alert-circle-outline" size={20} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View>}
        <View ref={submitRef} testID="tutorial-target-submit" collapsable={false}><Pressable testID="diagnosis-submit" accessibilityRole="button" accessibilityState={{ disabled: !enabled }} disabled={!enabled || !!processing} onPress={() => void submit()} style={({ pressed }) => [styles.submit, !enabled && styles.submitDisabled, pressed && enabled && styles.pressed]}><Ionicons name={image ? 'scan-outline' : 'chatbubble-ellipses-outline'} size={21} color="#fff" /><Text style={styles.submitText}>{image ? 'Kiểm tra ảnh' : 'Hỏi MaiCare'}</Text></Pressable></View>
      </> : submittedMode === 'text' ? <AssistantConversation conversationId={result.conversationId} question={submittedText} answer={result.answer} onNew={reset} /> : <DiagnosisResult result={result} originalText={submittedText} onNewDiagnosis={reset} />}
    </ScrollView>
    <ImageSourceSheet visible={sheetOpen} error={pickerError} onOpenSettings={libraryBlocked ? () => void Linking.openSettings() : undefined} onCamera={openCamera} onLibrary={() => void chooseLibrary()} onClose={() => { setSheetOpen(false); setPickerError(''); setLibraryBlocked(false); }} />
    <CameraCapture visible={cameraOpen} onCancel={() => setCameraOpen(false)} onCaptured={onCaptured} onLibrary={() => { setCameraOpen(false); void chooseLibrary(); }} />
    <CameraReview image={captured} onRetake={retake} onUse={useCaptured} />
    <DiagnosisProcessing mode={processing} />
  </KeyboardAvoidingView></SafeAreaView>;
}

function UploadCard({ onPress }: { onPress: () => void }) {
  return <Pressable testID="add-image-card" accessibilityRole="button" accessibilityLabel="Thêm ảnh lá mai" onPress={onPress} style={({ pressed }) => [styles.upload, pressed && styles.pressed]}><View style={styles.uploadIcon}><Ionicons name="camera-outline" size={28} color={colors.primary} /></View><Text style={styles.uploadTitle}>Thêm ảnh lá mai</Text><Text style={styles.uploadText}>Chụp ảnh mới hoặc chọn ảnh từ thiết bị</Text><View style={styles.uploadAction}><Ionicons name="add" size={18} color={colors.primary} /><Text style={styles.uploadActionText}>Thêm ảnh</Text></View></Pressable>;
}
function Tips() {
  const [open, setOpen] = useState(false);
  return <View style={styles.tips}><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={styles.tipsHeader}><View style={styles.tipsTitleRow}><Ionicons name="sunny-outline" size={18} color={colors.accent} /><Text style={styles.tipsTitle}>Mẹo chụp ảnh</Text></View><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} /></Pressable>{open && <View style={styles.tipList}><Text style={styles.tip}>• Chụp rõ phần lá có dấu hiệu bất thường.</Text><Text style={styles.tip}>• Giữ ảnh đủ sáng và hạn chế rung.</Text><Text style={styles.tip}>• Tránh chụp quá xa.</Text><Text style={styles.tip}>• Nếu có thể, để phần lá chiếm phần lớn khung hình.</Text></View>}</View>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, fill: { flex: 1 }, header: { minHeight: 70, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }, brandMark: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1 }, brand: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: .4 }, title: { color: colors.primaryDark, fontSize: 20, fontWeight: '900', marginTop: 1 },
  content: { padding: spacing.md, paddingBottom: 28, gap: 14 }, intro: { color: colors.muted, fontSize: 15, lineHeight: 22 }, upload: { minHeight: 176, padding: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#8EB59C', backgroundColor: colors.surface }, uploadIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 9 }, uploadTitle: { color: colors.text, fontSize: 18, fontWeight: '900' }, uploadText: { color: colors.muted, textAlign: 'center', marginTop: 4 }, uploadAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }, uploadActionText: { color: colors.primary, fontWeight: '800' }, pressed: { opacity: .76 },
  tips: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.accentSoft, overflow: 'hidden' }, tipsHeader: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, tipsTitleRow: { flexDirection: 'row', gap: 7, alignItems: 'center' }, tipsTitle: { color: colors.text, fontWeight: '800', fontSize: 13 }, tipList: { gap: 4, paddingHorizontal: 12, paddingBottom: 12 }, tip: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  field: { gap: 7 }, label: { color: colors.text, fontWeight: '800', fontSize: 14 }, textarea: { minHeight: 104, maxHeight: 170, padding: 13, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, fontSize: 15, lineHeight: 21 }, info: { flexDirection: 'row', gap: 8, padding: 11, borderRadius: radius.md, backgroundColor: colors.primarySoft }, infoText: { flex: 1, color: colors.primaryDark, fontSize: 13, lineHeight: 18 }, error: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.dangerSoft }, errorText: { flex: 1, color: colors.danger, lineHeight: 20 }, submit: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, submitDisabled: { backgroundColor: colors.disabled }, submitText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
