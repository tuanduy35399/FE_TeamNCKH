export type Account = { id: number; username: string; name: string; email: string; isStaff: boolean; dateJoined?: string };
export type Session = { accessToken: string; refreshToken: string };
export type SelectedImage = { uri: string; name: string; mimeType?: string; size?: number; file?: Blob };
export type DiseaseDetail = { id: number; name: string; information: string; imageUrl?: string };
export type DiagnosisResult = { answer?: string; nameDetect?: string; detectedImageUrl?: string; disease?: DiseaseDetail; confidence?: number };
export type HistoryItem = { id: number; body?: string; createdAt: string; inputImageUrl?: string; result?: DiagnosisResult };
