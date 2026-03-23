/**
 * useKanbanPreset.ts
 * Hook untuk load/save kanban preset dari DB.
 * Setiap user hanya punya 1 preset kanban per scope (kanban_engineer / kanban_ptl).
 *
 * Yang disimpan ke DB:
 * - columns  = cardFields (kolom yang tampil di kartu)
 * - widths   = { hiddenStatuses: string[] } — repurpose field widths untuk extra data JSON
 *
 * Warna, ukuran kolom, dll tetap di localStorage via appearanceStore.
 */
import { useState, useEffect, useCallback } from "react";
import presetApi from "../services/presetApi";
import type { PresetScope } from "../services/presetApi";

export interface KanbanPresetData {
  cardFields:     string[];
  hiddenStatuses: string[];
}

interface UseKanbanPresetReturn {
  preset:   KanbanPresetData | null;
  loading:  boolean;
  save:     (data: KanbanPresetData) => Promise<void>;
}

export function useKanbanPreset(scope: "kanban_engineer" | "kanban_ptl"): UseKanbanPresetReturn {
  const [preset,  setPreset]  = useState<KanbanPresetData | null>(null);
  const [dbId,    setDbId]    = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Load dari DB saat mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    presetApi.list(scope as PresetScope).then(list => {
      if (cancelled) return;
      const p = list[0]; // hanya 1 preset per scope per user
      if (p) {
        setDbId(p.id);
        // widths direpurpose sebagai extra JSON: { hiddenStatuses: [...] }
        const extra = p.widths as any;
        setPreset({
          cardFields:     Array.isArray(p.columns) ? p.columns : [],
          hiddenStatuses: Array.isArray(extra?.hiddenStatuses) ? extra.hiddenStatuses : [],
        });
      } else {
        setPreset(null);
        setDbId(null);
      }
    }).catch(() => {
      if (!cancelled) setPreset(null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [scope]);

  // Save ke DB — kalau belum ada buat baru, kalau sudah ada update
  const save = useCallback(async (data: KanbanPresetData) => {
    const payload = {
      columns: data.cardFields,
      widths:  { hiddenStatuses: data.hiddenStatuses } as any,
    };
    if (dbId) {
      await presetApi.update(dbId, payload);
    } else {
      const created = await presetApi.create({
        scope:   scope as PresetScope,
        name:    "kanban_default",
        columns: data.cardFields,
        widths:  { hiddenStatuses: data.hiddenStatuses } as any,
      });
      setDbId(created.id);
    }
    setPreset(data);
  }, [dbId, scope]);

  return { preset, loading, save };
}
