import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveCache(key: string, data: any): Promise<void> {
  try { await AsyncStorage.setItem('cache:' + key, JSON.stringify(data)); } catch { /* ignore */ }
}
export async function loadCache<T = any>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem('cache:' + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
export const LOCK_KEY = 'lockEnabled';
