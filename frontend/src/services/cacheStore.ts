import { del, get, set } from "idb-keyval";

export interface CacheScope {
  username: string;
  role: string;
}

const PREFIX = "dashboard-cache:v2";

function scopeId(scope: CacheScope): string {
  return `${encodeURIComponent(scope.username)}:${encodeURIComponent(scope.role)}`;
}

function scopedKey(name: string, scope: CacheScope): string {
  return `${PREFIX}:${name}:${scopeId(scope)}`;
}

function globalKey(name: string): string {
  return `${PREFIX}:${name}`;
}

export async function getScoped<T>(name: string, scope: CacheScope): Promise<T | undefined> {
  return get<T>(scopedKey(name, scope));
}

export async function setScoped<T>(name: string, scope: CacheScope, value: T): Promise<void> {
  await set(scopedKey(name, scope), value);
}

export async function delScoped(name: string, scope: CacheScope): Promise<void> {
  await del(scopedKey(name, scope));
}

export async function getGlobal<T>(name: string): Promise<T | undefined> {
  return get<T>(globalKey(name));
}

export async function setGlobal<T>(name: string, value: T): Promise<void> {
  await set(globalKey(name), value);
}

export async function delGlobal(name: string): Promise<void> {
  await del(globalKey(name));
}

export async function clearUserCache(scope: CacheScope): Promise<void> {
  await Promise.all([
    delScoped("records", scope),
    delScoped("ptl-records", scope),
    delScoped("status", scope),
  ]);
}
