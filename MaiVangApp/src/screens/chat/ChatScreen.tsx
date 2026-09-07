import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Linking, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createHistory, getHistoryDetail, sendHistoryImage, sendHistoryText } from '../../api/history';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthProvider';
import { AssistantContent } from '../../components/AssistantContent';
import { getLocalImageHistoryItem, saveLocalImageHistory } from '../../history/imageHistory';
import { loadActiveHistoryId, saveActiveHistoryId } from '../../chat/storage';
import { ImageSourceSheet } from '../diagnosis/ImageSourceSheet';
import { colors, radius, spacing } from '../../theme';
import type { ChatMessage, Detection, SelectedImage } from '../../types/domain';
import type { TabParamList } from '../../navigation/types';

type Props = BottomTabScreenProps<TabParamList, 'Chat'>;
const suggestions = ['Cách chăm mai sau Tết?', 'Vì sao lá mai bị vàng?', 'Khi nào nên bón phân?'];

function selectedAsset(asset: ImagePicker.ImagePickerAsset): SelectedImage {
  return {
    uri: asset.uri,
    name: asset.fileName || `mai-${Date.now()}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
    size: asset.fileSize,
    file: (asset as ImagePicker.ImagePickerAsset & { file?: Blob }).file,
  };
}

function normalizeDetections(value: unknown): Detection[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const raw = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      label: typeof raw.name === 'string' ? raw.name : undefined,
      confidence: typeof raw.confidence === 'number' ? raw.confidence : undefined,
    };
  });
}

function titleFor(text: string, hasImage: boolean) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, 80) : hasImage ? `Chẩn đoán ảnh ${new Date().toLocaleDateString('vi-VN')}` : 'Cuộc trò chuyện mới';
}

export function ChatScreen({ navigation, route }: Props) {
  const { account } = useAuth();
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [historyTitle, setHistoryTitle] = useState('Cuộc trò chuyện mới');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [diagnosisMode, setDiagnosisMode] = useState(false);
  const [image, setImage] = useState<SelectedImage>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickerError, setPickerError] = useState('');
  const [openSettings, setOpenSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const sendLocked = useRef(false);
  const restored = useRef(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  function beginGeneration() {
    generation.current += 1;
    sendLocked.current = false;
    setSending(false); setSendingImage(false);
    return generation.current;
  }

  async function openHistory(id: number) {
    const token = beginGeneration();
    setLoading(true); setError(''); setImage(undefined); setDiagnosisMode(false);
    try {
      const detail = await getHistoryDetail(id);
      const metadata = account?.id ? await getLocalImageHistoryItem(account.id, id) : undefined;
      if (token !== generation.current) return;
      let nextMessages = detail.messages || [];
      if (metadata?.imageUri) {
        const index = [...nextMessages].map(message => message.role).lastIndexOf('user');
        if (index >= 0) nextMessages = nextMessages.map((message, messageIndex) => messageIndex === index ? { ...message, imageUri: metadata.imageUri } : message);
        const assistantIndex = [...nextMessages].map(message => message.role).lastIndexOf('assistant');
        if (assistantIndex >= 0) nextMessages = nextMessages.map((message, messageIndex) => messageIndex === assistantIndex ? { ...message, detections: metadata.detections } : message);
      }
      setHistoryId(id); setHistoryTitle(detail.title || 'Cuộc trò chuyện'); setMessages(nextMessages);
      if (account?.id) await saveActiveHistoryId(account.id, id);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    } catch (value) {
      if (token !== generation.current) return;
      if (value instanceof ApiError && value.status === 404) {
        setHistoryId(null); setMessages([]); setHistoryTitle('Cuộc trò chuyện mới');
        if (account?.id) await saveActiveHistoryId(account.id, null);
        setError('Cuộc trò chuyện này không còn tồn tại. Bạn có thể bắt đầu cuộc trò chuyện mới.');
      } else setError(value instanceof ApiError ? value.userMessage : 'Không thể tải cuộc trò chuyện.');
    } finally { if (token === generation.current) setLoading(false); }
  }

  useEffect(() => {
    const requested = route.params?.historyId;
    if (requested) {
      navigation.setParams({ historyId: undefined, openKey: undefined });
      void openHistory(requested);
    }
  }, [route.params?.historyId, route.params?.openKey]);

  useEffect(() => {
    if (restored.current || !account?.id || route.params?.historyId) return;
    restored.current = true;
    void loadActiveHistoryId(account.id).then(id => { if (id) void openHistory(id); });
  }, [account?.id]);

  function newChat() {
    beginGeneration(); setHistoryId(null); setHistoryTitle('Cuộc trò chuyện mới'); setMessages([]);
    setText(''); setImage(undefined); setDiagnosisMode(false); setError(''); setLoading(false);
    if (account?.id) void saveActiveHistoryId(account.id, null);
  }

  async function chooseGallery() {
    setPickerError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setOpenSettings(!permission.canAskAgain);
        setPickerError('MaiCare cần quyền truy cập thư viện ảnh để bạn chọn ảnh.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.86 });
      if (!result.canceled && result.assets[0]) setImage(selectedAsset(result.assets[0]));
      setSheetOpen(false);
    } catch { setPickerError('Không thể mở thư viện ảnh lúc này.'); }
  }

  async function takePhoto() {
    setPickerError('');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setOpenSettings(!permission.canAskAgain);
        setPickerError('MaiCare cần quyền camera để bạn chụp ảnh lá mai.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.86 });
      if (!result.canceled && result.assets[0]) setImage(selectedAsset(result.assets[0]));
      setSheetOpen(false);
    } catch { setPickerError('Không thể mở camera lúc này.'); }
  }

  async function send() {
    const question = text.trim();
    const selected = image;
    if ((!question && !selected) || sendLocked.current) return;
    sendLocked.current = true;
    const token = generation.current;
    const now = new Date().toISOString();
    const optimistic: ChatMessage = { id: -Date.now(), role: 'user', content: question || 'Đã gửi một ảnh để chẩn đoán.', createdAt: now, imageUri: selected?.uri };
    setMessages(current => [...current, optimistic]); setText(''); setImage(undefined); setError(''); setSending(true); setSendingImage(!!selected);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    try {
      let targetId = historyId;
      if (!targetId) {
        const created = await createHistory(titleFor(question, !!selected));
        if (token !== generation.current) return;
        targetId = created.id; setHistoryId(targetId); setHistoryTitle(created.title);
        if (account?.id) await saveActiveHistoryId(account.id, targetId);
      }
      if (token !== generation.current) return;
      const response = selected ? await sendHistoryImage(targetId, selected, question || undefined) : await sendHistoryText(targetId, question);
      if (token !== generation.current) return;
      if (Number(response.history_id) !== targetId || typeof response.answer !== 'string' || !response.answer.trim()) throw new ApiError('Phản hồi từ máy chủ không hợp lệ.', undefined, undefined, 'malformed');
      const detections = selected ? normalizeDetections(response.detections) : undefined;
      const authoritativeQuestion = typeof response.question === 'string' && response.question.trim() ? response.question : optimistic.content;
      const assistant: ChatMessage = { id: -(Date.now() + 1), role: 'assistant', content: response.answer, createdAt: new Date().toISOString(), detections };
      setMessages(current => current.map(message => message.id === optimistic.id ? { ...message, content: authoritativeQuestion } : message).concat(assistant));
      if (selected && account?.id) await saveLocalImageHistory({ userId: account.id, conversationId: targetId, title: titleFor(question, true), description: question || undefined, detections: detections || [], image: selected }).catch(() => undefined);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (value) {
      if (token === generation.current) setError(value instanceof ApiError ? value.userMessage : 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      if (token === generation.current) { sendLocked.current = false; setSending(false); setSendingImage(false); }
    }
  }

  const canSend = (!!text.trim() || !!image) && !sending;
  return <SafeAreaView testID="chat-screen" style={styles.safe} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Mở lịch sử" onPress={() => navigation.navigate('History')} style={styles.headerButton}><Ionicons name="menu" size={24} color={colors.primaryDark} /></Pressable>
        <View style={styles.brand}><Text numberOfLines={1} style={styles.brandTitle}>MaiCare AI</Text><Text numberOfLines={1} style={styles.brandSubtitle}>{historyId ? historyTitle : 'Sẵn sàng hỗ trợ mai vàng'}</Text></View>
        <Pressable accessibilityLabel="Cuộc trò chuyện mới" onPress={newChat} style={styles.headerButton}><Ionicons name="create-outline" size={23} color={colors.primaryDark} /></Pressable>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Đang tải cuộc trò chuyện...</Text></View> :
        <FlatList ref={listRef} data={messages} keyExtractor={item => String(item.id)} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.list, !messages.length && styles.emptyList]}
          onContentSizeChange={() => messages.length && listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<View style={styles.welcome}><View style={styles.leaf}><Ionicons name="leaf" size={30} color={colors.primary} /></View><Text style={styles.welcomeTitle}>Xin chào, {account?.name || 'bạn'}!</Text><Text style={styles.welcomeText}>Hỏi bất cứ điều gì về chăm sóc mai vàng, hoặc bật Chẩn đoán khi bạn muốn gửi ảnh.</Text><View style={styles.chips}>{suggestions.map(item => <Pressable key={item} onPress={() => setText(item)} style={styles.chip}><Text style={styles.chipText}>{item}</Text></Pressable>)}</View></View>}
          renderItem={({ item }) => <MessageBubble message={item} />} />}

      {!!error && <View accessibilityRole="alert" style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => setError('')}><Ionicons name="close" size={18} color={colors.danger} /></Pressable></View>}
      {sending && <View style={styles.typing}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.muted}>{sendingImage ? 'Đang xử lý ảnh...' : 'MaiCare đang trả lời...'}</Text></View>}

      {diagnosisMode && <View style={styles.diagnosisTray}>
        <View style={styles.trayHeader}><View><Text style={styles.trayTitle}>Chẩn đoán ảnh</Text><Text style={styles.traySubtitle}>Chọn ảnh rõ vùng lá bất thường</Text></View><Pressable accessibilityLabel="Tắt chẩn đoán" onPress={() => { setDiagnosisMode(false); setImage(undefined); }}><Ionicons name="close-circle" size={24} color={colors.muted} /></Pressable></View>
        {image ? <View testID="selected-image" style={styles.previewRow}><Image source={{ uri: image.uri }} style={styles.preview} /><View style={styles.previewActions}><Pressable onPress={() => setSheetOpen(true)} style={styles.smallAction}><Text style={styles.smallActionText}>Thay ảnh</Text></Pressable><Pressable onPress={() => setImage(undefined)} style={styles.smallAction}><Text style={[styles.smallActionText, { color: colors.danger }]}>Xóa</Text></Pressable></View></View> : <Pressable testID="add-image" onPress={() => setSheetOpen(true)} style={styles.addImage}><Ionicons name="camera-outline" size={21} color={colors.primary} /><Text style={styles.addImageText}>Camera hoặc Thư viện</Text></Pressable>}
      </View>}

      <View style={styles.composer}>
        <Pressable testID="diagnosis-toggle" accessibilityRole="button" accessibilityState={{ selected: diagnosisMode }} onPress={() => setDiagnosisMode(value => !value)} style={[styles.diagnosisButton, diagnosisMode && styles.diagnosisActive]}><Ionicons name="scan-outline" size={20} color={diagnosisMode ? '#fff' : colors.primary} /><Text style={[styles.diagnosisLabel, diagnosisMode && styles.diagnosisLabelActive]}>Chẩn đoán</Text></Pressable>
        <View style={styles.inputShell}><TextInput value={text} onChangeText={setText} placeholder={diagnosisMode ? 'Thêm câu hỏi (không bắt buộc)...' : 'Nhắn tin cho MaiCare...'} placeholderTextColor={colors.muted} multiline maxLength={4000} style={styles.input} /><Pressable testID="chat-send" accessibilityLabel="Gửi" disabled={!canSend} onPress={() => void send()} style={[styles.send, !canSend && styles.sendDisabled]}><Ionicons name="arrow-up" size={21} color="#fff" /></Pressable></View>
      </View>
    </KeyboardAvoidingView>
    <ImageSourceSheet visible={sheetOpen} error={pickerError} onOpenSettings={openSettings ? () => void Linking.openSettings() : undefined} onCamera={() => void takePhoto()} onLibrary={() => void chooseGallery()} onClose={() => { setSheetOpen(false); setPickerError(''); setOpenSettings(false); }} />
  </SafeAreaView>;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const user = message.role === 'user';
  return <View testID={user ? 'user-message' : 'assistant-message'} style={[styles.messageRow, user && styles.userRow]}><View style={[styles.bubble, user ? styles.userBubble : styles.assistantBubble]}>
    {message.imageUri && <Image source={{ uri: message.imageUri }} resizeMode="cover" style={styles.messageImage} />}
    {!!message.content && (user ? <Text style={styles.userText}>{message.content}</Text> : <AssistantContent>{message.content}</AssistantContent>)}
    {message.detections && <View style={styles.detections}>{message.detections.length ? message.detections.map((detection, index) => <View key={`${detection.label}-${index}`} style={styles.detectionRow}><Ionicons name="leaf-outline" size={16} color={colors.primary} /><Text style={styles.detectionText}>{detection.label || 'Lớp bệnh'}</Text>{typeof detection.confidence === 'number' && <Text style={styles.confidence}>{Math.round(detection.confidence * (detection.confidence <= 1 ? 100 : 1))}%</Text>}</View>) : <Text style={styles.noDetection}>Không phát hiện lớp bệnh rõ ràng.</Text>}</View>}
  </View></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, fill: { flex: 1 },
  header: { minHeight: 66, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23 }, brand: { flex: 1, alignItems: 'center', paddingHorizontal: 4 }, brandTitle: { color: colors.primaryDark, fontSize: 17, fontWeight: '900' }, brandSubtitle: { color: colors.muted, fontSize: 11, marginTop: 2, maxWidth: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }, muted: { color: colors.muted, fontSize: 13 }, list: { padding: spacing.md, gap: 12, paddingBottom: 18 }, emptyList: { flexGrow: 1 },
  welcome: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 30 }, leaf: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, marginBottom: 14 }, welcomeTitle: { color: colors.primaryDark, fontSize: 23, fontWeight: '900' }, welcomeText: { color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 8, maxWidth: 330 }, chips: { width: '100%', gap: 8, marginTop: 20 }, chip: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, chipText: { color: colors.text, textAlign: 'center' },
  messageRow: { flexDirection: 'row', justifyContent: 'flex-start' }, userRow: { justifyContent: 'flex-end' }, bubble: { maxWidth: '88%', minWidth: 44, padding: 13, borderRadius: radius.lg, flexShrink: 1 }, userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 5 }, assistantBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 5 }, userText: { color: '#fff', fontSize: 15, lineHeight: 22, flexShrink: 1 }, messageImage: { width: 220, maxWidth: '100%', aspectRatio: 1.2, borderRadius: radius.md, backgroundColor: colors.primarySoft, marginBottom: 9 },
  detections: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 7 }, detectionRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, detectionText: { flex: 1, color: colors.text, fontWeight: '700' }, confidence: { color: colors.primaryDark, fontWeight: '800' }, noDetection: { color: colors.muted, fontStyle: 'italic', lineHeight: 20 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.dangerSoft }, errorText: { flex: 1, color: colors.danger, fontSize: 13 }, typing: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: 7, backgroundColor: colors.surface },
  diagnosisTray: { padding: 12, gap: 10, backgroundColor: colors.primarySoft, borderTopWidth: 1, borderTopColor: colors.border }, trayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, trayTitle: { color: colors.primaryDark, fontWeight: '900' }, traySubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 }, addImage: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.surface, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, addImageText: { color: colors.primary, fontWeight: '800' }, previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, preview: { width: 72, height: 72, borderRadius: radius.md }, previewActions: { flex: 1, flexDirection: 'row', gap: 8 }, smallAction: { minHeight: 42, paddingHorizontal: 14, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, smallActionText: { color: colors.primary, fontWeight: '800' },
  composer: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: Platform.OS === 'android' ? 10 : 8, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 7 }, diagnosisButton: { alignSelf: 'flex-start', minHeight: 36, paddingHorizontal: 11, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.primary }, diagnosisActive: { backgroundColor: colors.primary }, diagnosisLabel: { color: colors.primary, fontSize: 12, fontWeight: '800' }, diagnosisLabelActive: { color: '#fff' }, inputShell: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 24, backgroundColor: colors.background, paddingLeft: 14, paddingRight: 5, paddingVertical: 5 }, input: { flex: 1, minHeight: 38, maxHeight: 120, paddingTop: 8, paddingBottom: 8, color: colors.text, fontSize: 15, lineHeight: 21 }, send: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, sendDisabled: { backgroundColor: colors.disabled },
});
