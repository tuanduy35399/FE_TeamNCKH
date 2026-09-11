import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { LoadingState, StateView } from '../../components/StateView';
import { deleteHistory, getHistory, renameHistory } from '../../api/history';
import type { HistoryItem } from '../../types/domain';
import { colors, radius, spacing } from '../../theme';
import { formatDateTime } from '../../utils/date';
import { useAuth } from '../../auth/AuthProvider';
import { getLocalImageHistory } from '../../history/imageHistory';
import { useChatSession } from '../../chat/ChatSessionProvider';

export function HistoryScreen() {
  const { account } = useAuth();
  const navigation = useNavigation<any>();
  const { openHistory, currentHistoryId, newChat, historyRevision, invalidateHistory } = useChatSession();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<HistoryItem>();
  const [titleDraft, setTitleDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<number>();
  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true); setError('');
    try {
      const serverItems = await getHistory();
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.info('[MaiCare history list]', { status: 200, count: serverItems.length });
      const localById = new Map((account?.id ? await getLocalImageHistory(account.id) : []).map(item => [item.conversationId, item]));
      setItems(serverItems.map(item => {
        const metadata = localById.get(item.id);
        return metadata ? { ...item, kind: 'image' as const, description: metadata.description, detections: metadata.detections } : { ...item, kind: 'text' as const };
      }));
    }
    catch { setError('Chưa thể tải lịch sử. Vui lòng thử lại.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [account?.id]);
  async function openConversation(item: HistoryItem) {
    if (openingId) return;
    setOpeningId(item.id);
    const opened = await openHistory(item.id);
    setOpeningId(undefined);
    if (opened) navigation.navigate('Chat');
    else setError('Không thể mở cuộc trò chuyện này. Vui lòng thử lại.');
  }
  function confirmDelete(item: HistoryItem) {
    Alert.alert('Xóa cuộc trò chuyện?', 'Nội dung đã xóa không thể khôi phục.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => void deleteHistory(item.id).then(() => { setItems(current => current.filter(value => value.id !== item.id)); if (currentHistoryId === item.id) newChat(); invalidateHistory(); }).catch(() => setError('Không thể xóa cuộc trò chuyện.')) },
    ]);
  }
  async function saveRename() {
    const title = titleDraft.trim(); if (!editing || !title || saving) return;
    setSaving(true);
    try { const updated = await renameHistory(editing.id, title); setItems(current => current.map(item => item.id === updated.id ? { ...item, title: updated.title } : item)); setEditing(undefined); invalidateHistory(); }
    catch { setError('Không thể đổi tên cuộc trò chuyện.'); }
    finally { setSaving(false); }
  }
  useFocusEffect(useCallback(() => { void load(); }, [load, historyRevision]));
  if (loading) return <Screen><LoadingState label="Đang tải lịch sử..." /></Screen>;
  if (error && !items.length) return <Screen><View style={styles.header}><Text style={styles.title}>Lịch sử</Text><Text style={styles.subtitle}>Những lần kiểm tra và câu hỏi trước đây</Text></View><StateView icon="time-outline" title="Chưa thể tải lịch sử" message={error} actionLabel="Thử lại" onAction={() => load()} /></Screen>;
  return <Screen><View style={styles.header}><Text style={styles.title}>Lịch sử</Text><Text style={styles.subtitle}>Những lần kiểm tra và câu hỏi trước đây</Text></View>
    {!!error && <Pressable accessibilityRole="button" onPress={() => void load(true)} style={styles.errorBanner}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text accessibilityRole="alert" style={styles.errorText}>{error} Nhấn để thử lại.</Text></Pressable>}
    <FlatList data={items} keyExtractor={item => String(item.id)} contentContainerStyle={[styles.list, !items.length && styles.emptyList]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      ListEmptyComponent={<StateView title="Chưa có hoạt động nào." />}
      renderItem={({ item }) => <Pressable accessibilityRole="button" disabled={!!openingId} onPress={() => void openConversation(item)} style={styles.card}>
        <View style={styles.historyIcon}><Ionicons name={item.kind === 'image' ? 'image-outline' : 'chatbubble-outline'} size={22} color={colors.primary} /></View>
        <View style={styles.cardBody}><Text style={styles.date}>{formatDateTime(item.updatedAt)}</Text><Text numberOfLines={2} style={styles.preview}>{item.title || 'Cuộc trò chuyện MaiCare'}</Text></View>
        {openingId === item.id ? <ActivityIndicator color={colors.primary} /> : <Pressable accessibilityLabel="Tùy chọn cuộc trò chuyện" hitSlop={8} onPress={event => { event.stopPropagation(); setEditing(item); setTitleDraft(item.title); }} style={styles.more}><Ionicons name="ellipsis-vertical" size={20} color={colors.muted} /></Pressable>}
      </Pressable>} />
    <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(undefined)}><Pressable style={styles.overlay} onPress={() => setEditing(undefined)}><Pressable style={styles.dialog} onPress={() => undefined}>
      <Text style={styles.dialogTitle}>Quản lý cuộc trò chuyện</Text><TextInput value={titleDraft} onChangeText={setTitleDraft} maxLength={200} selectTextOnFocus style={styles.renameInput} />
      <View style={styles.dialogActions}><Pressable onPress={() => { const item = editing; setEditing(undefined); if (item) confirmDelete(item); }} style={styles.deleteButton}><Text style={styles.deleteText}>Xóa</Text></Pressable><View style={styles.actionSpacer} /><Pressable onPress={() => setEditing(undefined)} style={styles.cancelButton}><Text style={styles.cancelText}>Hủy</Text></Pressable><Pressable disabled={!titleDraft.trim() || saving} onPress={() => void saveRename()} style={styles.saveButton}><Text style={styles.saveText}>{saving ? 'Đang lưu...' : 'Lưu'}</Text></Pressable></View>
    </Pressable></Pressable></Modal>
  </Screen>;
}
const styles = StyleSheet.create({
  header: { padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }, title: { color: colors.primaryDark, fontSize: 23, fontWeight: '800' }, subtitle: { color: colors.muted, marginTop: 2 },
  errorBanner: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, backgroundColor: colors.dangerSoft }, errorText: { flex: 1, color: colors.danger, fontSize: 13 }, list: { padding: spacing.md, gap: spacing.sm }, emptyList: { flexGrow: 1 }, card: { minHeight: 88, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  historyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, cardBody: { flex: 1, gap: 4 }, date: { color: colors.muted, fontSize: 12 }, preview: { color: colors.text, fontWeight: '700', lineHeight: 20 },
  more: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }, overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.overlay }, dialog: { width: '100%', maxWidth: 390, padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface }, dialogTitle: { color: colors.primaryDark, fontSize: 19, fontWeight: '900' }, renameInput: { minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.text, backgroundColor: colors.background }, dialogActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, actionSpacer: { flex: 1 }, deleteButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, deleteText: { color: colors.danger, fontWeight: '800' }, cancelButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }, cancelText: { color: colors.muted, fontWeight: '800' }, saveButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.primary }, saveText: { color: '#fff', fontWeight: '800' },
});
