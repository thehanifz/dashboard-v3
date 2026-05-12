/**
 * recordCache.ts
 * Cache permanen untuk records engineer menggunakan IndexedDB.
 * Data tidak pernah expire — hanya diganti saat user klik Refresh manual.
 */
import { get, set, del } from "idb-keyval";
import type { RecordRow } from "../state/taskStore";

const KEY_RECORDS  = "records_cache";
const KEY_COLUMNS  = "records_columns";
const KEY_META     = "records_meta";

export interface CacheMeta {
  lastSyncedAt: string; // ISO string
  totalRows: number;
}

/** Simpan records + columns + metadata ke IndexedDB */
export async function setCachedRecords(
  records: RecordRow[],
  columns: string[]
): Promise<void> {
  const meta: CacheMeta = {
    lastSyncedAt: new Date().toISOString(),
    totalRows: records.length,
  };
  await Promise.all([
    set(KEY_RECORDS, records),
    set(KEY_COLUMNS, columns),
    set(KEY_META, meta),
  ]);
}

/** Ambil records + columns dari IndexedDB. Return null jika belum ada. */
export async function getCachedRecords(): Promise<{
  records: RecordRow[];
  columns: string[];
  meta: CacheMeta;
} | null> {
  const [records, columns, meta] = await Promise.all([
    get<RecordRow[]>(KEY_RECORDS),
    get<string[]>(KEY_COLUMNS),
    get<CacheMeta>(KEY_META),
  ]);
  if (!records || !columns || !meta) return null;
  return { records, columns, meta };
}

/** Ambil hanya metadata (cepat, tanpa load seluruh data) */
export async function getCacheMeta(): Promise<CacheMeta | null> {
  return (await get<CacheMeta>(KEY_META)) ?? null;
}

/** Hapus seluruh cache */
export async function clearCache(): Promise<void> {
  await Promise.all([del(KEY_RECORDS), del(KEY_COLUMNS), del(KEY_META)]);
}
