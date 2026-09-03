import type { HistoryItem } from '../types/domain';
export type AuthStackParamList = { Login: { username?: string; registered?: boolean } | undefined; Register: undefined };
export type MainStackParamList = { Tabs: undefined; HistoryDetail: { item: HistoryItem } };
export type TabParamList = { Diagnosis: undefined; History: undefined; Account: undefined };
