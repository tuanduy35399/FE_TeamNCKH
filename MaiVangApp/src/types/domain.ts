export type Account = { id: number; username: string; name: string; email: string; isStaff: boolean; dateJoined?: string };
export type Session = { accessToken: string; refreshToken: string; account?: Account };
export type SelectedImage = { uri: string; name: string; mimeType?: string; size?: number; file?: Blob };
export type DiseaseDetail = { id: number; name: string; information: string; imageUrl?: string };
export type Detection = { label?: string; confidence?: number };
export type DiagnosisResult = { answer: string; conversationId: number; detections: Detection[]; originalImageUri?: string };
export type ChatMessage = { id: number; role: 'user' | 'assistant' | string; content: string; createdAt: string; imageUri?: string; detections?: Detection[] };
export type HistoryItem = {
  id: number; title: string; createdAt: string; updatedAt: string; messages?: ChatMessage[];
  kind?: 'text' | 'image'; imageUri?: string; transientImageUri?: boolean; description?: string; detections?: Detection[];
};
