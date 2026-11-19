export type AuthStackParamList = { Login: { username?: string; registered?: boolean; passwordReset?: boolean } | undefined; Register: undefined; ForgotPassword: undefined };
export type MainStackParamList = { Tabs: undefined };
export type TabParamList = { Chat: { historyId?: number; openKey?: number } | undefined; History: undefined; Account: undefined };
