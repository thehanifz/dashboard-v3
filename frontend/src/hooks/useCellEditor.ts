/**
 * hooks/useCellEditor.ts
 * Manage state edit cell inline + validasi permission via useRole.
 *
 * Perubahan dari versi sebelumnya:
 *   - Logika canEditCell sekarang delegasi ke useRole.canEditColumn
 *   - Tidak ada lagi switch/if role manual di sini
 *   - statusColumn & detailColumn tetap dikecualikan (readonly saat inline edit)
 */
import { useState } from "react";
import { useTaskStore } from "../state/taskStore";
import { useRole } from "./useRole";

type StatusMaster = {
  status_column: string;
  detail_column: string;
};

type PtlEditableSet = Set<string>;

export function useCellEditor(
  statusMaster: StatusMaster | null,
  ptlEditableSet: PtlEditableSet
) {
  const { canEditColumn } = useRole();
  const updateCell = useTaskStore(s => s.updateCell);

  const statusColumn = statusMaster?.status_column ?? "";
  const detailColumn = statusMaster?.detail_column ?? "";

  const [editingCell, setEditingCell]   = useState<{ rowId: number; col: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");

  /**
   * Kolom status & detail selalu dikecualikan dari inline edit
   * (ditangani oleh StatusCell / dropdown khusus).
   */
  function canEditCell(col: string): boolean {
    if (statusColumn && col === statusColumn) return false;
    if (detailColumn && col === detailColumn) return false;
    return canEditColumn(col, ptlEditableSet);
  }

  function handleCellClick(rowId: number, col: string, currentValue: string) {
    if (!canEditCell(col)) return;
    setEditingCell({ rowId, col });
    setEditingValue(currentValue ?? "");
  }

  async function handleCellCommit(rowId: number, col: string) {
    setEditingCell(null);
    await updateCell(rowId, col, editingValue);
  }

  function handleCellKeyDown(e: React.KeyboardEvent, rowId: number, col: string) {
    if (e.key === "Enter")  handleCellCommit(rowId, col);
    if (e.key === "Escape") setEditingCell(null);
  }

  return {
    editingCell,
    editingValue,
    setEditingValue,
    canEditCell,
    handleCellClick,
    handleCellCommit,
    handleCellKeyDown,
  };
}
