import { get, set, del } from "idb-keyval";
import type { RecordRow, SheetRecord, PTLSheetData } from "../state/taskStore";
import { getScoped, setScoped, delScoped, type CacheScope } from "./cacheStore";

export interface CacheMeta {
  lastSyncedAt: string;
  totalRows: number;
}

interface RecordsCache {
  records: RecordRow[];
  columns: string[];
  meta: CacheMeta;
}

const LEGACY_KEYS = ["records_cache", "records_columns", "records_meta", "ptl_records_cache"];

export async function setCachedRecords(records: RecordRow[], columns: string[], scope: CacheScope): Promise<void> {
  const value: RecordsCache = {
    records,
    columns,
    meta: { lastSyncedAt: new Date().toISOString(), totalRows: records.length },
  };
  await setScoped("records", scope, value);
}

export async function getCachedRecords(scope: CacheScope): Promise<RecordsCache | null> {
  const cached = await getScoped<RecordsCache>("records", scope);
  if (cached === undefined) return null;
  if (!Array.isArray(cached.records) || !Array.isArray(cached.columns) || !cached.meta) {
    throw new Error("Corrupt records cache");
  }
  return cached;
}

export async function getCacheMeta(scope: CacheScope): Promise<CacheMeta | null> {
  const cached = await getScoped<RecordsCache>("records", scope);
  return cached?.meta ?? null;
}

export async function clearCache(scope: CacheScope): Promise<void> {
  await delScoped("records", scope);
}

export async function setCachedPtlSheet(data: PTLSheetData, scope: CacheScope): Promise<void> {
  await setScoped("ptl-records", scope, data);
}

export async function getCachedPtlSheet(scope: CacheScope): Promise<PTLSheetData | null> {
  const cached = await getScoped<PTLSheetData>("ptl-records", scope);
  if (cached === undefined) return null;
  if (!Array.isArray(cached.records) || !Array.isArray(cached.columns)) {
    throw new Error("Corrupt PTL cache");
  }
  return cached;
}

export async function updateCachedPtlRecord(rowId: number, updates: Record<string, string>, scope: CacheScope): Promise<void> {
  const cached = await getCachedPtlSheet(scope);
  if (!cached) return;
  const records = cached.records.map((record: SheetRecord) =>
    record.row_id === rowId ? { ...record, data: { ...record.data, ...updates } } : record
  );
  await setCachedPtlSheet({ ...cached, records }, scope);
}

/** Remove pre-v2 unscoped cache so it can never be reused across users. */
export async function clearLegacyCache(): Promise<void> {
  await Promise.all(LEGACY_KEYS.map(key => del(key)));
}
