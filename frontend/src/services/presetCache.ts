import { get, set, del } from "idb-keyval";
import { SESSION_USER } from "../constants/storageKeys";
import type { DBPreset, PresetScope } from "./presetApi";

function cacheKey(scope: PresetScope): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_USER);
    if (!raw) return null;
    const user = JSON.parse(raw) as { username?: string; role?: string };
    if (!user?.username || !user?.role) return null;
    return `presets:${user.username}:${user.role}:${scope}`;
  } catch {
    return null;
  }
}

export async function getPresetCache(scope: PresetScope): Promise<DBPreset[] | null> {
  const key = cacheKey(scope);
  if (!key) return null;
  try {
    const value = await get<DBPreset[]>(key);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export async function setPresetCache(scope: PresetScope, presets: DBPreset[]): Promise<void> {
  const key = cacheKey(scope);
  if (!key) return;
  try {
    await set(key, presets);
  } catch {}
}

export async function clearPresetCache(scope: PresetScope): Promise<void> {
  const key = cacheKey(scope);
  if (!key) return;
  try {
    await del(key);
  } catch {}
}
