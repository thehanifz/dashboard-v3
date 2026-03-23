/**
 * usePresets.ts
 * Hook untuk manajemen preset kolom.
 * pinnedColumns disimpan di widths.__pinned dan di-decode saat load.
 */
import { useEffect, useState, useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import presetApi, {
  Preset, PresetScope, PresetCreatePayload, PresetUpdatePayload,
  encodeWidths, decodePinned, decodeWidths,
} from "../services/presetApi";

// ── Tipe preset dengan pinnedColumns yang sudah di-decode ────────────────────
export interface DecodedPreset extends Omit<Preset, "widths"> {
  widths:         Record<string, number>;
  pinnedColumns:  string[];
}

// ── Active preset ID store (localStorage per scope) ───────────────────────────
interface ActivePresetState {
  engineerActiveId: number | null;
  ptlActiveId:      number | null;
  setEngineerId:    (id: number | null) => void;
  setPtlId:         (id: number | null) => void;
}

export const useActivePresetStore = create<ActivePresetState>()(
  persist(
    (set) => ({
      engineerActiveId: null,
      ptlActiveId:      null,
      setEngineerId:    (id) => set({ engineerActiveId: id }),
      setPtlId:         (id) => set({ ptlActiveId: id }),
    }),
    { name: "active-preset-ids" }
  )
);

function decodePreset(p: Preset): DecodedPreset {
  return {
    ...p,
    widths:        decodeWidths(p.widths),
    pinnedColumns: decodePinned(p.widths),
  };
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function usePresets(scope: PresetScope) {
  const [presets,  setPresets]  = useState<DecodedPreset[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const { engineerActiveId, ptlActiveId, setEngineerId, setPtlId } = useActivePresetStore();

  const activePresetId    = scope === "engineer" ? engineerActiveId : ptlActiveId;
  const setActivePresetId = useCallback((id: number | null) => {
    scope === "engineer" ? setEngineerId(id) : setPtlId(id);
  }, [scope, setEngineerId, setPtlId]);

  const activePreset = presets.find(p => p.id === activePresetId) ?? null;

  const fetchPresets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await presetApi.list(scope);
      setPresets(data.map(decodePreset));
      if (activePresetId !== null && !data.find(p => p.id === activePresetId)) {
        setActivePresetId(null);
      }
    } catch {
      setError("Gagal memuat preset");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { fetchPresets(); }, [fetchPresets]);

  const createPreset = useCallback(async (payload: Omit<PresetCreatePayload, "scope">) => {
    const created = await presetApi.create({ ...payload, scope });
    const decoded = decodePreset(created);
    setPresets(prev => [...prev, decoded]);
    setActivePresetId(decoded.id);
    return decoded;
  }, [scope, setActivePresetId]);

  // Update — encode pinnedColumns ke widths sebelum kirim ke API
  const updatePreset = useCallback(async (
    id: number,
    payload: PresetUpdatePayload & { pinnedColumns?: string[] },
  ) => {
    // Ambil preset lama untuk merge widths + pinnedColumns
    const current = presets.find(p => p.id === id);
    let apiPayload: PresetUpdatePayload = { ...payload };

    if (payload.pinnedColumns !== undefined || payload.widths !== undefined) {
      const baseWidths  = (payload.widths as Record<string, number> | undefined)
        ?? current?.widths ?? {};
      const pinned      = payload.pinnedColumns ?? current?.pinnedColumns ?? [];
      apiPayload = {
        ...apiPayload,
        widths: encodeWidths(baseWidths, pinned),
      };
      delete (apiPayload as any).pinnedColumns;
    }

    const updated = await presetApi.update(id, apiPayload);
    const decoded = decodePreset(updated);
    setPresets(prev => prev.map(p => p.id === id ? decoded : p));
    return decoded;
  }, [presets]);

  const deletePreset = useCallback(async (id: number) => {
    await presetApi.remove(id);
    setPresets(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activePresetId === id) setActivePresetId(next[0]?.id ?? null);
      return next;
    });
  }, [activePresetId, setActivePresetId]);

  return {
    presets,
    loading,
    error,
    activePreset,
    activePresetId,
    setActivePresetId,
    createPreset,
    updatePreset,
    deletePreset,
    refetch: fetchPresets,
  };
}