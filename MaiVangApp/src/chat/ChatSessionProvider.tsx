import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react';
import { getHistoryDetail } from '../api/history';
import { ApiError } from '../api/errors';
import { useAuth } from '../auth/AuthProvider';
import { getLocalImageHistoryItems } from '../history/imageHistory';
import { mergeLocalImageTurns } from '../history/imageHistoryMerge';
import type { ChatMessage } from '../types/domain';
import { loadActiveHistoryId, saveActiveHistoryId } from './storage';

type SessionContext = {
  currentHistoryId: number | null;
  historyTitle: string;
  messages: ChatMessage[];
  loadingHistory: boolean;
  historyLoadError: string;
  historyLoadTarget?: number;
  setCurrentHistoryId: (id: number | null) => void;
  setHistoryTitle: (title: string) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  openHistory: (id: number) => Promise<boolean>;
  newChat: () => void;
  beginGeneration: () => number;
  isCurrentGeneration: (token: number) => boolean;
};

const ChatSessionContext = createContext<SessionContext | null>(null);

export function ChatSessionProvider({ children }: PropsWithChildren) {
  const { account } = useAuth();
  const [currentHistoryId, setCurrentHistoryId] = useState<number | null>(null);
  const [historyTitle, setHistoryTitle] = useState('Cuộc trò chuyện mới');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoadError, setHistoryLoadError] = useState('');
  const [historyLoadTarget, setHistoryLoadTarget] = useState<number>();
  const generation = useRef(0);
  const restoredUser = useRef<number | undefined>(undefined);

  const beginGeneration = useCallback(() => ++generation.current, []);
  const isCurrentGeneration = useCallback((token: number) => token === generation.current, []);

  const newChat = useCallback(() => {
    beginGeneration();
    setCurrentHistoryId(null);
    setHistoryTitle('Cuộc trò chuyện mới');
    setMessages([]);
    setHistoryLoadError('');
    setHistoryLoadTarget(undefined);
    setLoadingHistory(false);
    if (account?.id) void saveActiveHistoryId(account.id, null);
  }, [account?.id, beginGeneration]);

  const openHistory = useCallback(async (id: number) => {
    if (!Number.isInteger(id) || id <= 0) return false;
    const token = beginGeneration();
    setLoadingHistory(true);
    setHistoryLoadError('');
    setHistoryLoadTarget(id);
    try {
      const detail = await getHistoryDetail(id);
      if (detail.id !== id) throw new ApiError('Phản hồi lịch sử không khớp.', undefined, undefined, 'malformed');
      const metadata = account?.id ? await getLocalImageHistoryItems(account.id, id).catch(() => []) : [];
      if (!isCurrentGeneration(token)) return false;
      setCurrentHistoryId(detail.id);
      setHistoryTitle(detail.title || 'Cuộc trò chuyện');
      setMessages(mergeLocalImageTurns(detail.messages || [], metadata));
      if (account?.id) await saveActiveHistoryId(account.id, detail.id);
      return true;
    } catch (error) {
      if (!isCurrentGeneration(token)) return false;
      if (error instanceof ApiError && error.status === 404) {
        setCurrentHistoryId(null);
        setHistoryTitle('Cuộc trò chuyện mới');
        setMessages([]);
        setHistoryLoadTarget(undefined);
        if (account?.id) await saveActiveHistoryId(account.id, null);
      } else {
        setHistoryLoadError('Không thể tải cuộc trò chuyện này. Vui lòng thử lại.');
      }
      return false;
    } finally {
      if (isCurrentGeneration(token)) setLoadingHistory(false);
    }
  }, [account?.id, beginGeneration, isCurrentGeneration]);

  useEffect(() => {
    if (!account?.id || restoredUser.current === account.id) return;
    restoredUser.current = account.id;
    let active = true;
    void loadActiveHistoryId(account.id).then(id => {
      if (active && id) void openHistory(id);
    });
    return () => { active = false; };
  }, [account?.id, openHistory]);

  const value = useMemo<SessionContext>(() => ({
    currentHistoryId, historyTitle, messages, loadingHistory, historyLoadError, historyLoadTarget,
    setCurrentHistoryId, setHistoryTitle, setMessages, openHistory, newChat, beginGeneration, isCurrentGeneration,
  }), [currentHistoryId, historyTitle, messages, loadingHistory, historyLoadError, historyLoadTarget, openHistory, newChat, beginGeneration, isCurrentGeneration]);
  return <ChatSessionContext.Provider value={value}>{children}</ChatSessionContext.Provider>;
}

export function useChatSession() {
  const value = useContext(ChatSessionContext);
  if (!value) throw new Error('useChatSession must be used inside ChatSessionProvider');
  return value;
}
