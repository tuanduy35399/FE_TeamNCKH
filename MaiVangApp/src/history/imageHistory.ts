import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { Detection, SelectedImage } from '../types/domain';

const VERSION = 1;
const META_PREFIX = `maicare_image_history_v${VERSION}`;
const DB_NAME = 'maicare-image-history';
const STORE_NAME = 'images';

export type LocalImageHistory = {
  version: 1;
  userId: number;
  conversationId: number;
  title: string;
  description?: string;
  detections: Detection[];
  createdAt: string;
  storedImageUri?: string;
  imageUri?: string;
  transientImageUri?: boolean;
};

function metadataKey(userId: number) { return `${META_PREFIX}:${userId}`; }
function nativeDirectory(userId: number) { return `${FileSystem.documentDirectory}maicare-history-v${VERSION}/${userId}/`; }
function nativeMetadataPath(userId: number) { return `${nativeDirectory(userId)}metadata.json`; }

function validRecords(value: unknown, userId: number): LocalImageHistory[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is LocalImageHistory => {
    if (!item || typeof item !== 'object') return false;
    const record = item as Partial<LocalImageHistory>;
    return record.version === VERSION && record.userId === userId && typeof record.conversationId === 'number' && typeof record.title === 'string';
  });
}

async function readMetadata(userId: number): Promise<LocalImageHistory[]> {
  try {
    if (Platform.OS === 'web') return validRecords(JSON.parse(globalThis.localStorage?.getItem(metadataKey(userId)) || '[]'), userId);
    const path = nativeMetadataPath(userId);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return [];
    return validRecords(JSON.parse(await FileSystem.readAsStringAsync(path)), userId);
  } catch { return []; }
}

async function writeMetadata(userId: number, records: LocalImageHistory[]) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(metadataKey(userId), JSON.stringify(records));
    return;
  }
  const directory = nativeDirectory(userId);
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  await FileSystem.writeAsStringAsync(nativeMetadataPath(userId), JSON.stringify(records));
}

function openImageDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putWebImage(key: string, blob: Blob) {
  const db = await openImageDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(blob, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function getWebImage(key: string): Promise<Blob | undefined> {
  const db = await openImageDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

async function deleteWebImage(key: string) {
  const db = await openImageDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

function extensionFor(image: SelectedImage) {
  const fromName = image.name.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  if (fromName) return fromName;
  return image.mimeType === 'image/png' ? 'png' : 'jpg';
}

export async function saveLocalImageHistory(input: {
  userId: number; conversationId: number; title: string; description?: string; detections: Detection[]; image: SelectedImage;
}) {
  const key = `${input.userId}:${input.conversationId}`;
  let storedImageUri: string | undefined;
  if (Platform.OS === 'web') {
    const blob = input.image.file || await (await fetch(input.image.uri)).blob();
    await putWebImage(key, blob);
  } else {
    const directory = nativeDirectory(input.userId);
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    storedImageUri = `${directory}${input.conversationId}.${extensionFor(input.image)}`;
    await FileSystem.copyAsync({ from: input.image.uri, to: storedImageUri });
  }
  const record: LocalImageHistory = {
    version: VERSION, userId: input.userId, conversationId: input.conversationId, title: input.title,
    description: input.description, detections: input.detections, createdAt: new Date().toISOString(), storedImageUri,
  };
  const records = await readMetadata(input.userId);
  await writeMetadata(input.userId, [...records.filter(item => item.conversationId !== input.conversationId), record]);
}

export async function getLocalImageHistory(userId: number): Promise<LocalImageHistory[]> { return readMetadata(userId); }

export async function getLocalImageHistoryItem(userId: number, conversationId: number): Promise<LocalImageHistory | undefined> {
  const record = (await readMetadata(userId)).find(item => item.conversationId === conversationId);
  if (!record) return undefined;
  if (Platform.OS !== 'web') return { ...record, imageUri: record.storedImageUri };
  try {
    const blob = await getWebImage(`${userId}:${conversationId}`);
    return blob ? { ...record, imageUri: URL.createObjectURL(blob), transientImageUri: true } : record;
  } catch { return record; }
}

export async function clearLocalImageHistoryForUser(userId: number) {
  const records = await readMetadata(userId);
  if (Platform.OS === 'web') {
    await Promise.all(records.map(record => deleteWebImage(`${userId}:${record.conversationId}`).catch(() => undefined)));
    globalThis.localStorage?.removeItem(metadataKey(userId));
    return;
  }
  await FileSystem.deleteAsync(nativeDirectory(userId), { idempotent: true });
}
