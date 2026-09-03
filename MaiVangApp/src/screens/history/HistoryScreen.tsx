import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { LoadingState, StateView } from '../../components/StateView';
import { getHistory } from '../../api/history';
import { ApiError } from '../../api/errors';
import type { HistoryItem } from '../../types/domain';
import { colors, radius, spacing } from '../../theme';
import { formatDateTime } from '../../utils/date';

export function HistoryScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true); setError('');
    try { setItems((await getHistory()).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))); }
    catch (value) { setError(value instanceof ApiError ? value.userMessage : 'Không thể tải lịch sử.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <Screen><LoadingState label="Đang tải lịch sử..." /></Screen>;
  if (error && !items.length) return <Screen><View style={styles.header}><Text style={styles.title}>Lịch sử</Text><Text style={styles.subtitle}>Những lần kiểm tra và câu hỏi trước đây</Text></View><StateView icon="time-outline" title="Chưa có lịch sử để hiển thị" message={error} actionLabel="Thử lại" onAction={() => load()} /></Screen>;
  return <Screen><View style={styles.header}><Text style={styles.title}>Lịch sử</Text><Text style={styles.subtitle}>Các lần chẩn đoán gần đây</Text></View>
    <FlatList data={items} keyExtractor={item => String(item.id)} contentContainerStyle={[styles.list, !items.length && styles.emptyList]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      ListEmptyComponent={<StateView title="Chưa có lịch sử để hiển thị" message="Những lần kiểm tra và câu hỏi của bạn sẽ xuất hiện tại đây khi tính năng sẵn sàng." />}
      renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => navigation.navigate('HistoryDetail', { item })} style={styles.card}>
        {item.inputImageUrl && <Image source={{ uri: item.inputImageUrl }} style={styles.thumb} />}
        <View style={styles.cardBody}><Text style={styles.date}>{formatDateTime(item.createdAt)}</Text><Text numberOfLines={2} style={styles.preview}>{item.body || item.result?.nameDetect || 'Lần chẩn đoán bằng hình ảnh'}</Text>{item.result?.answer && <Text numberOfLines={2} style={styles.answer}>{item.result.answer}</Text>}</View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>} />
  </Screen>;
}
const styles = StyleSheet.create({
  header: { padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }, title: { color: colors.primaryDark, fontSize: 23, fontWeight: '800' }, subtitle: { color: colors.muted, marginTop: 2 },
  list: { padding: spacing.md, gap: spacing.sm }, emptyList: { flexGrow: 1 }, card: { minHeight: 88, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  thumb: { width: 66, height: 66, borderRadius: radius.sm, backgroundColor: colors.border }, cardBody: { flex: 1, gap: 4 }, date: { color: colors.muted, fontSize: 12 }, preview: { color: colors.text, fontWeight: '700', lineHeight: 20 }, answer: { color: colors.muted, fontSize: 13 },
});
