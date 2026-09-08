import { SESSION_USER } from "../constants/storageKeys";
import type { CacheScope } from "./cacheStore";

export function getCurrentCacheScope(): CacheScope | null {
  try {
    const raw = sessionStorage.getItem(SESSION_USER);
    if (!raw) return null;
    const user = JSON.parse(raw) as { username?: string; role?: string };
    if (!user.username || !user.role) return null;
    return { username: user.username, role: user.role };
  } catch {
    return null;
  }
}
