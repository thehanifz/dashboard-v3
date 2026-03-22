/**
 * usePresets.ts
 * Hook untuk manajemen preset kolom.
 *
 * - Preset DATA → dari database via /api/presets
 * - activePresetId → localStorage (Zustand persist, per scope)
 *
 * Cara pakai:
 *   const { presets, activePreset, createPreset, updatePreset, deletePreset, setActivePresetId } = usePresets("engineer");
 */
import { useEffect, useState, useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import presetApi, { Preset, PresetScope, PresetCreatePayload, PresetUpdatePayload } from "../services/presetApi";

// ── Active preset ID store (localStorage per scope) ───────────────────────────
// Disimpan terpisah per scope agar tidak saling tumpuk
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

// ── Main hook ─────────────────────────────────────────────────────────────────
export function usePresets(scope: PresetScope) {
  const [presets,  setPresets]  = useState<Preset[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const { engineerActiveId, ptlActiveId, setEngineerId, setPtlId } = useActivePresetStore();

  const activePresetId = scope === "engineer" ? engineerActiveId : ptlActiveId;
  const setActivePresetId = useCallback((id: number | null) => {
    scope === "engineer" ? setEngineerId(id) : setPtlId(id);
  }, [scope, setEngineerId, setPtlId]);

  const activePreset = presets.find(p => p.id === activePresetId) ?? null;

  // Fetch dari DB
  const fetchPresets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await presetApi.list(scope);
      setPresets(data);
      // Jika activePresetId tidak ada di data, reset ke null
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

  // Create
  const createPreset = useCallback(async (payload: Omit<PresetCreatePayload, "scope">) => {
    const created = await presetApi.create({ ...payload, scope });
    setPresets(prev => [...prev, created]);
    setActivePresetId(created.id);
    return created;
  }, [scope, setActivePresetId]);

  // Update (nama / kolom / widths)
  const updatePreset = useCallback(async (id: number, payload: PresetUpdatePayload) => {
    const updated = await presetApi.update(id, payload);
    setPresets(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  }, []);

  // Delete
  const deletePreset = useCallback(async (id: number) => {
    await presetApi.remove(id);
    setPresets(prev => {
      const next = prev.filter(p => p.id !== id);
      // Jika yang dihapus adalah yang aktif, pindah ke preset pertama
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