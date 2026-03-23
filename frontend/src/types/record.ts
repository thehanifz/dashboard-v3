/**
 * record.ts
 * Shared types untuk data record GSheet — dipakai Engineer, PTL, Mitra.
 * Import dari sini, jangan define ulang di masing-masing komponen.
 */

/** Satu baris data dari GSheet */
export interface SheetRecord {
  id?:    string;
  row_id: number;
  data:   Record<string, string>;
}

/** Alias lama — backward compat */
export type RecordRow = SheetRecord;

/** Status master dari /api/status */
export interface StatusMaster {
  primary:       string[];
  mapping:       Record<string, string[]>;
  status_column: string;
  detail_column: string;
}

export default SheetRecord;
