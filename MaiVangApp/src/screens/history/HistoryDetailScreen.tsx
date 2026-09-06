import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { getHistoryDetail } from '../../api/history';
import { ApiError } from '../../api/errors';
import { LoadingState, StateView } from '../../components/StateView';
import { Screen } from '../../components/Screen';
import { colors, radius, spacing } from '../../theme';
import { formatDateTime } from '../../utils/date';
import type { MainStackParamList } from '../../navigation/types';
import type { HistoryItem } from '../../types/domain';
import { useAuth } from '../../auth/AuthProvider';
import { getLocalImageHistoryItem } from '../../history/imageHistory';
import { AssistantContent } from '../../components/AssistantContent';

type Props = NativeStackScreenProps<MainStackParamList, 'HistoryDetail'>;
export function HistoryDetailScreen({ route }: Props) {
  const { account } = useAuth();
  const [item, setItem] = useState<HistoryItem>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setError('');
    void (async () => {
      const serverItem = await getHistoryDetail(route.params.item.id);
      const metadata = account?.id ? await getLocalImageHistoryItem(account.id, route.params.item.id) : undefined;
      if (active) setItem(metadata ? { ...serverItem, kind: 'image', title: metadata.title, description: metadata.description, detections: metadata.detections, imageUri: metadata.imageUri, transientImageUri: metadata.transientImageUri } : { ...serverItem, kind: 'text' });
    })().catch(value => { if (active) setError(value instanceof ApiError ? value.userMessage : 'Không thể tải chi tiết lịch sử.'); });
    return () => { active = false; };
  }, [route.params.item.id, account?.id, retry]);
  useEffect(() => () => {
    if (Platform.OS === 'web' && item?.transientImageUri && item.imageUri) URL.revokeObjectURL(item.imageUri);
  }, [item?.imageUri, item?.transientImageUri]);
  if (!item && !error) return <Screen><LoadingState label="Đang tải chi tiết..." /></Screen>;
  if (!item) return <Screen><StateView title="Chưa thể mở lịch sử" message={error} actionLabel="Thử lại" onAction={() => setRetry(value => value + 1)} /></Screen>;
  return <Screen scroll testID="history-detail"><Text style={styles.date}>{formatDateTime(item.updatedAt)}</Text><Section title="Nội dung"><Text style={styles.titleText}>{item.title || 'Cuộc trò chuyện MaiCare'}</Text></Section>
    {item.imageUri && <Section title="Ảnh đã kiểm tra"><Image source={{ uri: item.imageUri }} resizeMode="contain" style={styles.image} /></Section>}
    {item.description && <Section title="Mô tả của bạn"><Text style={styles.titleText}>{item.description}</Text></Section>}
    {!!item.detections?.length && <Section title="Tình trạng nhận diện">{item.detections.map((detection, index) => <View key={`${detection.label}-${index}`} style={styles.detection}><Text style={styles.titleText}>{detection.label || 'Dấu hiệu trên lá'}</Text>{typeof detection.confidence === 'number' && <Text style={styles.confidence}>Mức độ phù hợp: {Math.round(detection.confidence * (detection.confidence <= 1 ? 100 : 1))}%</Text>}</View>)}</Section>}
    {(item.messages || []).map(message => <View key={message.id} style={[styles.message, message.role === 'user' ? styles.user : styles.assistant]}><Text style={styles.role}>{message.role === 'user' ? 'Bạn' : 'MaiCare'}</Text>{message.role === 'user' ? <Text style={[styles.text, styles.userText]}>{message.content}</Text> : <AssistantContent testID="history-assistant-answer">{message.content}</AssistantContent>}</View>)}
    {!item.messages?.length && <StateView title="Chưa có nội dung" message="Cuộc trò chuyện này chưa có tin nhắn." />}
  </Screen>;
}
function Section({ title, children }: React.PropsWithChildren<{ title: string }>) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
const styles = StyleSheet.create({
  date: { color: colors.muted, marginBottom: spacing.md }, section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md }, sectionTitle: { color: colors.primaryDark, fontSize: 16, fontWeight: '800' }, titleText: { color: colors.text, lineHeight: 22 }, image: { width: '100%', aspectRatio: 1.25, borderRadius: radius.md, backgroundColor: colors.primarySoft }, detection: { gap: 3 }, confidence: { color: colors.muted, fontSize: 13 },
  message: { maxWidth: '94%', borderRadius: radius.lg, padding: 14, marginBottom: spacing.sm, gap: 5 }, user: { alignSelf: 'flex-end', backgroundColor: colors.primary }, assistant: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, role: { color: colors.accent, fontSize: 12, fontWeight: '800' }, text: { color: colors.text, lineHeight: 23 }, userText: { color: colors.surface },
});
