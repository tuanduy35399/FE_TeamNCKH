import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import * as authApi from '../api/auth';
import { configureApiSession } from '../api/client';
import { clearSession, loadSession, saveSession } from './storage';
import type { Account, Session } from '../types/domain';
import { clearLocalImageHistoryForUser } from '../history/imageHistory';

type AuthContextValue = {
  status: 'restoring' | 'unauthenticated' | 'authenticated';
  account: Account | null;
  notice: string | null;
  clearNotice: () => void;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthContextValue['status']>('restoring');
  const [account, setAccount] = useState<Account | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);

  async function persist(next: Session) { sessionRef.current = next; await saveSession(next); }
  async function invalidate(message?: string) {
    sessionRef.current = null; setAccount(null); await clearSession();
    if (message) setNotice(message);
    setStatus('unauthenticated');
  }

  useEffect(() => {
    configureApiSession({ getSession: () => sessionRef.current, updateSession: persist, invalidate });
    void (async () => {
      const stored = await loadSession();
      if (!stored) { setStatus('unauthenticated'); return; }
      sessionRef.current = stored;
      try { setAccount(await authApi.getMe()); setStatus('authenticated'); }
      catch { await invalidate('Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.'); }
    })();
    return () => configureApiSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status, account, notice, clearNotice: () => setNotice(null),
    signIn: async (username, password) => {
      const session = await authApi.login(username, password);
      await persist(session);
      try { setAccount(await authApi.getMe()); setNotice(null); setStatus('authenticated'); }
      catch (error) { await invalidate(); throw error; }
    },
    signOut: async () => {
      const refresh = sessionRef.current?.refreshToken;
      if (refresh) { try { await authApi.logout(refresh); } catch { /* Local logout remains safe if revocation is unreachable. */ } }
      await invalidate();
    },
    deleteAccount: async () => {
      const userId = account?.id;
      await authApi.deleteMe();
      if (userId) await clearLocalImageHistoryForUser(userId).catch(() => undefined);
      await invalidate('Tài khoản đã được xóa.');
    },
  }), [status, account, notice]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
