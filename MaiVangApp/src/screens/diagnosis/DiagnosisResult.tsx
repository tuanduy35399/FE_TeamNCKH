import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { submitDiagnosis } from '../../api/diagnosis';
import { ApiError } from '../../api/errors';
import { colors, radius, spacing } from '../../theme';
import type { DiagnosisResult as Result } from '../../types/domain';
import { AssistantContent } from '../../components/AssistantContent';

type Message = { question: string; answer?: string; error?: string };
export function DiagnosisResult({ result, originalText, onNewDiagnosis }: { result: Result; originalText?: string; onNewDiagnosis: () => void }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  async function sendFollowUp() {
    const question = followUp.trim(); if (!question || busy) return;
    setFollowUp(''); setBusy(true); setMessages(value => [...value, { question }]);
    try {
      const next = await submitDiagnosis({ text: question, conversationId: result.conversationId });
      setMessages(value => value.map((message, index) => index === value.length - 1 ? { ...message, answer: next.answer } : message));
    } catch (value) {
      const error = value instanceof ApiError ? value.userMessage : 'Chưa thể trả lời lúc này. Vui lòng thử lại sau.';
      setMessages(items => items.map((message, index) => index === items.length - 1 ? { ...message, error } : message));
    } finally { setBusy(false); }
  }
  return <View style={styles.wrap} testID="diagnosis-result">
    <View style={styles.heading}><View style={styles.headingIcon}><Ionicons name="leaf" size={21} color={colors.primary} /></View><Text style={styles.headingText}>Kết quả kiểm tra</Text></View>
    {!!result.originalImageUri && <Section title="Ảnh đã kiểm tra"><Image source={{ uri: result.originalImageUri }} resizeMode="contain" style={styles.image} /></Section>}
    {!!result.detections.length && <Section title="Tình trạng nhận diện">{result.detections.map((item, index) => <View key={`${item.label}-${index}`} style={styles.detectionRow}><Text style={styles.condition}>{item.label || 'Dấu hiệu trên lá'}</Text>{typeof item.confidence === 'number' && <Text style={styles.confidence}>Mức độ phù hợp: {Math.round(item.confidence * (item.confidence <= 1 ? 100 : 1))}%</Text>}</View>)}</Section>}
    <Section title="Thông tin"><AssistantContent testID="diagnosis-assistant-answer">{result.answer}</AssistantContent></Section>
    <Pressable testID="open-follow-up" accessibilityRole="button" onPress={() => setChatOpen(true)} style={styles.followButton}><Ionicons name="chatbubble-ellipses-outline" size={21} color={colors.primary} /><Text style={styles.followButtonText}>Hỏi thêm về kết quả</Text></Pressable>
    {chatOpen && <View style={styles.chat} testID="follow-up-chat"><Text style={styles.chatTitle}>Trợ lý MaiCare</Text><Text style={styles.chatIntro}>Bạn có thể hỏi thêm về cách chăm sóc, dấu hiệu cần theo dõi hoặc kết quả vừa nhận.</Text>{!!originalText && <View style={styles.question}><Text style={styles.questionLabel}>Mô tả ban đầu của bạn</Text><Text style={styles.questionText}>{originalText}</Text></View>}{messages.map((message, index) => <View key={`${message.question}-${index}`} style={styles.exchange}><View style={styles.userMessage}><Text style={styles.userMessageText}>{message.question}</Text></View>{message.answer && <AssistantContent testID="follow-up-assistant-answer">{message.answer}</AssistantContent>}{message.error && <Text accessibilityRole="alert" style={styles.messageError}>{message.error}</Text>}</View>)}<View style={styles.composer}><TextInput accessibilityLabel="Câu hỏi tiếp theo" value={followUp} onChangeText={setFollowUp} multiline placeholder="Nhập câu hỏi tiếp theo..." placeholderTextColor={colors.muted} style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Gửi câu hỏi tiếp theo" disabled={!followUp.trim() || busy} onPress={() => void sendFollowUp()} style={[styles.send, (!followUp.trim() || busy) && styles.disabled]}><Ionicons name="send" size={19} color="#fff" /></Pressable></View>{busy && <Text style={styles.unavailable}>Đang tìm câu trả lời...</Text>}</View>}
    <Pressable accessibilityRole="button" onPress={onNewDiagnosis} style={styles.newButton}><Text style={styles.newButtonText}>Kiểm tra ảnh khác</Text></Pressable>
  </View>;
}
function Section({ title, children }: React.PropsWithChildren<{ title: string }>) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
const styles = StyleSheet.create({
  wrap: { gap: spacing.md, paddingTop: spacing.sm }, heading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, headingIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, headingText: { color: colors.primaryDark, fontSize: 22, fontWeight: '900' },
  section: { padding: spacing.md, gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, sectionTitle: { color: colors.primaryDark, fontWeight: '800', fontSize: 16 }, detectionRow: { gap: 4 }, condition: { color: colors.text, fontWeight: '800', fontSize: 18 }, confidence: { color: colors.muted, fontSize: 13 }, body: { color: colors.text, lineHeight: 23 }, image: { width: '100%', aspectRatio: 1.25, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  followButton: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, followButtonText: { color: colors.primary, fontWeight: '800' }, chat: { gap: 10, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, chatTitle: { color: colors.primaryDark, fontSize: 18, fontWeight: '900' }, chatIntro: { color: colors.muted, lineHeight: 21 },
  question: { padding: 12, borderRadius: radius.md, backgroundColor: colors.primarySoft, gap: 4 }, questionLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' }, questionText: { color: colors.text }, exchange: { gap: 7 }, userMessage: { alignSelf: 'flex-end', maxWidth: '88%', padding: 10, borderRadius: radius.md, backgroundColor: colors.primary }, userMessageText: { color: '#fff' }, messageError: { color: colors.danger, backgroundColor: colors.dangerSoft, padding: 9, borderRadius: radius.sm },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, input: { flex: 1, minHeight: 48, maxHeight: 110, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.text }, send: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: .42 }, unavailable: { color: colors.muted, fontSize: 13 }, newButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' }, newButtonText: { color: colors.primary, fontWeight: '800' },
});
