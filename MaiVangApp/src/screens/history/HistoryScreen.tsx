import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { LoadingState, StateView } from '../../components/StateView';
import { getHistory } from '../../api/history';
import type { HistoryItem } from '../../types/domain';
import { colors, radius, spacing } from '../../theme';
import { formatDateTime } from '../../utils/date';
import { useAuth } from '../../auth/AuthProvider';
import { getLocalImageHistory } from '../../history/imageHistory';

export function HistoryScreen() {
  const { account } = useAuth();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true); setError('');
    try {
      const serverItems = await getHistory();
      const localById = new Map((account?.id ? await getLocalImageHistory(account.id) : []).map(item => [item.conversationId, item]));
      setItems(serverItems.map(item => {
        const metadata = localById.get(item.id);
        return metadata ? { ...item, kind: 'image' as const, title: metadata.title, description: metadata.description, detections: metadata.detections } : { ...item, kind: 'text' as const };
      }));
    }
    catch { setError('Chưa thể tải lịch sử. Vui lòng thử lại.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [account?.id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <Screen><LoadingState label="Đang tải lịch sử..." /></Screen>;
  if (error && !items.length) return <Screen><View style={styles.header}><Text style={styles.title}>Lịch sử</Text><Text style={styles.subtitle}>Những lần kiểm tra và câu hỏi trước đây</Text></View><StateView icon="time-outline" title="Chưa thể tải lịch sử" message={error} actionLabel="Thử lại" onAction={() => load()} /></Screen>;
  return <Screen><View style={styles.header}><Text style={styles.title}>Lịch sử</Text><Text style={styles.subtitle}>Những lần kiểm tra và câu hỏi trước đây</Text></View>
    <FlatList data={items} keyExtractor={item => String(item.id)} contentContainerStyle={[styles.list, !items.length && styles.emptyList]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      ListEmptyComponent={<StateView title="Chưa có hoạt động nào." />}
      renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => navigation.navigate('HistoryDetail', { item })} style={styles.card}>
        <View style={styles.historyIcon}><Ionicons name={item.kind === 'image' ? 'image-outline' : 'chatbubble-outline'} size={22} color={colors.primary} /></View>
        <View style={styles.cardBody}><Text style={styles.date}>{formatDateTime(item.updatedAt)}</Text><Text numberOfLines={2} style={styles.preview}>{item.title || 'Cuộc trò chuyện MaiCare'}</Text></View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>} />
  </Screen>;
}
const styles = StyleSheet.create({
  header: { padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }, title: { color: colors.primaryDark, fontSize: 23, fontWeight: '800' }, subtitle: { color: colors.muted, marginTop: 2 },
  list: { padding: spacing.md, gap: spacing.sm }, emptyList: { flexGrow: 1 }, card: { minHeight: 88, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  historyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, cardBody: { flex: 1, gap: 4 }, date: { color: colors.muted, fontSize: 12 }, preview: { color: colors.text, fontWeight: '700', lineHeight: 20 },
});
