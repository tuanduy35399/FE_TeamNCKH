import { Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import type { SelectedImage } from '../types/domain';
import { imageNormalizationPlan, JPEG_QUALITY } from './imagePolicy';

export async function normalizeImageForUpload(image: SelectedImage): Promise<SelectedImage> {
  if (Platform.OS === 'web') return image;
  const plan = imageNormalizationPlan(image);
  if (!plan.normalize) return image;
  const result = await manipulateAsync(image.uri, plan.resize ? [{ resize: plan.resize }] : [], { compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  const info = await FileSystem.getInfoAsync(result.uri);
  return {
    ...image,
    uploadUri: result.uri,
    uploadName: `${image.name.replace(/\.[^.]+$/, '') || `mai-${Date.now()}`}.jpg`,
    uploadMimeType: 'image/jpeg',
    uploadSize: info.exists && 'size' in info ? info.size : undefined,
    width: result.width,
    height: result.height,
  };
}

export async function cleanupNormalizedImage(image?: SelectedImage): Promise<void> {
  if (Platform.OS === 'web' || !image?.uploadUri || image.uploadUri === image.uri) return;
  await FileSystem.deleteAsync(image.uploadUri, { idempotent: true }).catch(() => undefined);
}
