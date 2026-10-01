import { createMMKV } from "react-native-mmkv";

export const storage = createMMKV({
  id: "aircircle",
});

export function getJson<T>(key: string): T | undefined {
  const raw = storage.getString(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted data — treat as absent.
    return undefined;
  }
}

export function setJson<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

export function remove(key: string): void {
  storage.remove(key);
}
