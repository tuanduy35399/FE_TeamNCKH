import type { SelectedImage } from '../types/domain';

export const MAX_IMAGE_EDGE = 2048;
export const JPEG_QUALITY = 0.86;

export type ImageNormalizationPlan = { normalize: boolean; resize?: { width?: number; height?: number }; reason?: 'heic' | 'large' | 'unsupported' | 'content-uri' };

export function imageNormalizationPlan(image: SelectedImage): ImageNormalizationPlan {
  const mime = (image.mimeType || '').toLowerCase();
  const extension = image.name.split('.').pop()?.toLowerCase();
  const heic = mime.includes('heic') || mime.includes('heif') || extension === 'heic' || extension === 'heif';
  const contentUri = image.uri.toLowerCase().startsWith('content://');
  const supported = mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/png' || ['jpg', 'jpeg', 'png'].includes(extension || '');
  const longEdge = Math.max(image.width || 0, image.height || 0);
  const large = longEdge > MAX_IMAGE_EDGE || (image.size || 0) > 8 * 1024 * 1024;
  if (!heic && !contentUri && supported && !large) return { normalize: false };
  const resize = longEdge > MAX_IMAGE_EDGE
    ? image.width! >= image.height! ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE }
    : undefined;
  return { normalize: true, resize, reason: heic ? 'heic' : large ? 'large' : contentUri ? 'content-uri' : 'unsupported' };
}
