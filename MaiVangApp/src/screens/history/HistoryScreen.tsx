import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { LoadingState, StateView } from '../../components/StateView';
import { deleteHistory, getHistory, renameHistory } from '../../api/history';
import { ApiError } from '../../api/errors';
import type { HistoryItem } from '../../types/domain';
import { colors, radius, spacing } from '../../theme';
import { formatDateTime } from '../../utils/date';
import { useAuth } from '../../auth/AuthProvider';
import { deleteLocalImageHistoryForConversation, getLocalImageHistory } from '../../history/imageHistory';
import { useChatSession } from '../../chat/ChatSessionProvider';
import { HistoryListGuard } from '../../history/historyListGuard';

const DELETE_ERROR = 'Không thể xóa cuộc trò chuyện. Vui lòng thử lại.';

export function HistoryScreen() {
  const { account } = useAuth();
  const navigation = useNavigation<any>();
  const { openHistory, clearHistoryIfActive, historyRevision, invalidateHistory } = useChatSession();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [editing, setEditing] = useState<HistoryItem>();
  const [titleDraft, setTitleDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<number>();
  const [openErrorId, setOpenErrorId] = useState<number>();
  const [pendingDelete, setPendingDelete] = useState<HistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const listGuard = useRef(new HistoryListGuard()).current;
  const deleteLock = useRef(false);
  const pendingDeleteRef = useRef<HistoryItem | null>(null);
  pendingDeleteRef.current = pendingDelete;
  const modalTransition = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enrichAndApply = useCallback(async (serverItems: HistoryItem[], sequence: number) => {
    if (!listGuard.isCurrent(sequence)) return;
    const visible = listGuard.visible(serverItems);
    setItems(visible.map(item => ({ ...item, kind: 'text' as const })));
    if (!account?.id) return;
    try {
      const localById = new Map((await getLocalImageHistory(account.id)).map(item => [item.conversationId, item]));
      if (!listGuard.isCurrent(sequence)) return;
      setItems(visible.map(item => {
        const metadata = localById.get(item.id);
        return metadata ? { ...item, kind: 'image' as const, description: metadata.description, detections: metadata.detections } : { ...item, kind: 'text' as const };
      }));
    } catch (storageError) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[MaiCare local history list enrichment skipped]', { reason: storageError instanceof Error ? storageError.message : 'storage error' });
    }
  }, [account?.id, listGuard]);

  const load = useCallback(async (refresh = false, verifyDeletedId?: number) => {
    const sequence = listGuard.beginLoad();
    if (refresh) setRefreshing(true);
    else if (!pendingDeleteRef.current) setLoading(true);
    setError('');
    setLoadFailed(false);
    try {
      const serverItems = await getHistory();
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.info('[MaiCare history list]', { status: 200, count: serverItems.length });
      await enrichAndApply(serverItems, sequence);
      return verifyDeletedId === undefined || !serverItems.some(item => item.id === verifyDeletedId);
    } catch {
      if (listGuard.isCurrent(sequence)) { setLoadFailed(true); setError('Chưa thể tải lịch sử. Vui lòng thử lại.'); }
      return false;
    } finally {
      if (listGuard.isCurrent(sequence)) { setLoading(false); setRefreshing(false); }
    }
  }, [enrichAndApply, listGuard]);

  useEffect(() => () => { if (modalTransition.current) clearTimeout(modalTransition.current); }, []);

  async function openConversation(item: HistoryItem) {
    if (openingId) return;
    setOpenErrorId(undefined);
    setOpeningId(item.id);
    const opened = await openHistory(item.id);
    setOpeningId(undefined);
    if (opened) navigation.navigate('Chat');
    else setOpenErrorId(item.id);
  }

  function requestDelete(item: HistoryItem) {
    setEditing(undefined);
    setDeleteError('');
    if (modalTransition.current) clearTimeout(modalTransition.current);
    modalTransition.current = setTimeout(() => { setPendingDelete(item); modalTransition.current = null; }, 0);
  }

  function dismissDelete() {
    if (deleteLock.current) return;
    setDeleteError('');
    setPendingDelete(null);
  }

  async function confirmDelete() {
    const item = pendingDelete;
    if (!item || deleteLock.current) return;
    deleteLock.current = true;
    setDeleting(true);
    setDeleteError('');
    let deleteReturnedSuccess = false;
    try {
      try {
        await deleteHistory(item.id);
        deleteReturnedSuccess = true;
      } catch (deleteFailure) {
        if (!(deleteFailure instanceof ApiError) || deleteFailure.status !== 404) throw deleteFailure;
      }
      listGuard.markDeleted(item.id);
      setItems(current => current.filter(value => value.id !== item.id));
      invalidateHistory();
      const verifiedAbsent = await load(true, item.id);
      if (!deleteReturnedSuccess && !verifiedAbsent) throw new Error('Deletion was not confirmed by the server.');
      clearHistoryIfActive(item.id);
      if (account?.id) {
        try { await deleteLocalImageHistoryForConversation(account.id, item.id); }
        catch { setError('Cuộc trò chuyện đã được xóa, nhưng một số ảnh lưu trên thiết bị chưa thể dọn dẹp.'); }
      }
      if (deleteReturnedSuccess && !verifiedAbsent) setError('Cuộc trò chuyện đã được xóa, nhưng chưa thể xác minh lại danh sách từ máy chủ.');
      if (!deleteReturnedSuccess) setError('Cuộc trò chuyện này đã không còn trên máy chủ.');
      setPendingDelete(null);
    } catch (deleteFailure) {
      listGuard.restore(item.id);
      setDeleteError(deleteFailure instanceof ApiError ? deleteFailure.userMessage : DELETE_ERROR);
    } finally {
      deleteLock.current = false;
      setDeleting(false);
    }
  }

  async function saveRename() {
    const title = titleDraft.trim(); if (!editing || !title || saving) return;
    setSaving(true);
    try { const updated = await renameHistory(editing.id, title); setItems(current => current.map(item => item.id === updated.id ? { ...item, title: updated.title } : item)); setEditing(undefined); invalidateHistory(); }
    catch { setError('Không thể đổi tên cuộc trò chuyện.'); }
    finally { setSaving(false); }
  }

  useFocusEffect(useCallback(() => { void load(); }, [load, historyRevision]));
  if (loading) return <Screen testID="history-screen"><LoadingState label="Đang tải lịch sử..." /></Screen>;
  if (loadFailed && !items.length) return <Screen testID="history-screen"><View style={styles.header}><Text style={styles.title}>Lịch sử</Text><Text style={styles.subtitle}>Những lần kiểm tra và câu hỏi trước đây</Text></View><StateView icon="time-outline" title="Chưa thể tải lịch sử" message={error} actionLabel="Thử lại" onAction={() => void load()} /></Screen>;
  return <Screen testID="history-screen"><View style={styles.header}><Text style={styles.title}>Lịch sử</Text><Text style={styles.subtitle}>Những lần kiểm tra và câu hỏi trước đây</Text></View>
    {!!error && <Pressable accessibilityRole="button" onPress={() => void load(true)} style={styles.errorBanner}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text accessibilityRole="alert" style={styles.errorText}>{error} Nhấn để thử lại.</Text></Pressable>}
    <FlatList data={items} keyExtractor={item => String(item.id)} contentContainerStyle={[styles.list, !items.length && styles.emptyList]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
      ListEmptyComponent={<StateView title="Chưa có hoạt động nào." />}
      renderItem={({ item }) => <View><Pressable accessibilityRole="button" disabled={!!openingId} onPress={() => void openConversation(item)} style={styles.card}>
        <View style={styles.historyIcon}><Ionicons name={item.kind === 'image' ? 'image-outline' : 'chatbubble-outline'} size={22} color={colors.primary} /></View>
        <View style={styles.cardBody}><Text style={styles.date}>{formatDateTime(item.updatedAt)}</Text><Text numberOfLines={2} style={styles.preview}>{item.title || 'Cuộc trò chuyện MaiCare'}</Text></View>
        {openingId === item.id ? <ActivityIndicator color={colors.primary} /> : <Pressable accessibilityLabel={`Tùy chọn cuộc trò chuyện ${item.title || item.id}`} hitSlop={8} onPress={event => { event.stopPropagation(); setEditing(item); setTitleDraft(item.title); }} style={styles.more}><Ionicons name="ellipsis-vertical" size={20} color={colors.muted} /></Pressable>}
      </Pressable>{openErrorId === item.id ? <View style={styles.openError}><Text accessibilityRole="alert" style={styles.openErrorText}>Không thể tải cuộc trò chuyện.</Text><Pressable accessibilityRole="button" onPress={() => void openConversation(item)} style={styles.openRetry}><Text style={styles.openRetryText}>Thử lại</Text></Pressable></View> : null}</View>} />
    <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(undefined)}><Pressable style={styles.overlay} onPress={() => setEditing(undefined)}><Pressable testID="history-management-modal" accessibilityViewIsModal style={styles.dialog} onPress={event => event.stopPropagation()}>
      <Text style={styles.dialogTitle}>Quản lý cuộc trò chuyện</Text><TextInput value={titleDraft} onChangeText={setTitleDraft} maxLength={200} selectTextOnFocus style={styles.renameInput} />
      <View style={styles.dialogActions}><Pressable accessibilityRole="button" onPress={() => editing && requestDelete(editing)} style={styles.deleteButton}><Text style={styles.deleteText}>Xóa</Text></Pressable><View style={styles.actionSpacer} /><Pressable accessibilityRole="button" onPress={() => setEditing(undefined)} style={styles.cancelButton}><Text style={styles.cancelText}>Hủy</Text></Pressable><Pressable accessibilityRole="button" disabled={!titleDraft.trim() || saving} onPress={() => void saveRename()} style={styles.saveButton}><Text style={styles.saveText}>{saving ? 'Đang lưu...' : 'Lưu'}</Text></Pressable></View>
    </Pressable></Pressable></Modal>
    <Modal visible={!!pendingDelete} transparent animationType="fade" onRequestClose={dismissDelete}><Pressable testID="delete-confirmation-backdrop" style={styles.overlay} onPress={dismissDelete}><Pressable testID="delete-confirmation-modal" accessibilityViewIsModal accessibilityLabel="Xác nhận xóa cuộc trò chuyện" style={styles.dialog} onPress={event => event.stopPropagation()}>
      <View style={styles.warningIcon}><Ionicons name="trash-outline" size={25} color={colors.danger} /></View>
      <Text style={styles.dialogTitle}>Xóa cuộc trò chuyện?</Text>
      <Text style={styles.deleteTitle}>{pendingDelete?.title || 'Cuộc trò chuyện MaiCare'}</Text>
      <Text style={styles.warningText}>Hành động này không thể hoàn tác. Toàn bộ nội dung cuộc trò chuyện sẽ bị xóa vĩnh viễn.</Text>
      {!!deleteError && <Text accessibilityRole="alert" style={styles.deleteError}>{deleteError}</Text>}
      <View style={styles.confirmActions}><Pressable accessibilityRole="button" disabled={deleting} onPress={dismissDelete} style={[styles.confirmCancel, deleting && styles.disabled]}><Text style={styles.cancelText}>Hủy</Text></Pressable><Pressable testID="confirm-history-delete" accessibilityRole="button" accessibilityState={{ busy: deleting, disabled: deleting }} disabled={deleting} onPress={() => void confirmDelete()} style={[styles.confirmDelete, deleting && styles.disabled]}>{deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmDeleteText}>Xóa</Text>}</Pressable></View>
    </Pressable></Pressable></Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  header: { padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }, title: { color: colors.primaryDark, fontSize: 23, fontWeight: '800' }, subtitle: { color: colors.muted, marginTop: 2 },
  errorBanner: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, backgroundColor: colors.dangerSoft }, errorText: { flex: 1, color: colors.danger, fontSize: 13 }, list: { padding: spacing.md, gap: spacing.sm }, emptyList: { flexGrow: 1 }, card: { minHeight: 88, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  historyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, cardBody: { flex: 1, gap: 4 }, date: { color: colors.muted, fontSize: 12 }, preview: { color: colors.text, fontWeight: '700', lineHeight: 20 },
  more: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }, overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.overlay }, dialog: { width: '100%', maxWidth: 390, padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface }, dialogTitle: { color: colors.primaryDark, fontSize: 19, fontWeight: '900' }, renameInput: { minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.text, backgroundColor: colors.background }, dialogActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, actionSpacer: { flex: 1 }, deleteButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, deleteText: { color: colors.danger, fontWeight: '800' }, cancelButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }, cancelText: { color: colors.muted, fontWeight: '800' }, saveButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.primary }, saveText: { color: '#fff', fontWeight: '800' },
  warningIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft }, deleteTitle: { color: colors.text, fontSize: 16, fontWeight: '800' }, warningText: { color: colors.muted, lineHeight: 21 }, deleteError: { color: colors.danger, lineHeight: 20 }, confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }, confirmCancel: { minWidth: 88, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, confirmDelete: { minWidth: 96, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.danger }, confirmDeleteText: { color: '#fff', fontWeight: '900' }, disabled: { opacity: 0.55 },
  openError: { minHeight: 44, marginTop: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: radius.sm, backgroundColor: colors.dangerSoft }, openErrorText: { flex: 1, color: colors.danger, fontSize: 13 }, openRetry: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 10 }, openRetryText: { color: colors.danger, fontWeight: '900' },
});
