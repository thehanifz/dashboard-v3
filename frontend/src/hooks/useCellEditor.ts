import { useState } from "react";
import { useTaskStore } from "../state/taskStore";
import { useAuthStore } from "../state/authStore";
import { useAppearanceStore } from "../state/appearanceStore";

type StatusMaster = {
  status_column: string;
  detail_column: string;
};

type PtlEditableSet = Set<string>;

export function useCellEditor(
  statusMaster: StatusMaster | null,
  ptlEditableSet: PtlEditableSet
) {
  const { user }  = useAuthStore();
  const updateCell = useTaskStore(s => s.updateCell);
  const editableColumns = useAppearanceStore(s => s.editableColumns);

  const role = user?.role ?? "engineer";
  const statusColumn = statusMaster?.status_column ?? "";
  const detailColumn = statusMaster?.detail_column ?? "";

  const [editingCell, setEditingCell]   = useState<{ rowId: number; col: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");

  function canEditCell(col: string): boolean {
    if (statusColumn && col === statusColumn) return false;
    if (detailColumn && col === detailColumn) return false;
    if (role === "engineer") return editableColumns.includes(col);
    if (role === "ptl")      return ptlEditableSet.has(col);
    return false;
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
