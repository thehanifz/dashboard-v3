import { useMemo, useRef } from "react";
import { useAppearanceStore } from "../state/appearanceStore";

type Record = { row_id: number; data: Record<string, string> };

type StatusMaster = {
  status_column: string;
  detail_column: string;
  primary: string[];
};

export function useTableData(
  records: Record[],
  search: string,
  statusMaster: StatusMaster | null,
  filterRefreshKey = 0,
) {
  const activeFilters = useAppearanceStore(s => s.activeFilters);
  const filterSnapshotRef = useRef<{ signature: string; rowIds: Set<number> } | null>(null);

  const statusSortIndex = useMemo(() => {
    const primary = statusMaster?.primary ?? [];
    const map: Record<string, number> = {};
    primary.forEach((s, i) => { map[s] = i; });
    return { map, unknownIndex: primary.length };
  }, [statusMaster]);

  const filteredRecords = useMemo(() => {
    const statusColumn = statusMaster?.status_column ?? "";
    const hasFilters = Object.keys(activeFilters).length > 0;
    let result = [...records];

    if (hasFilters) {
      const signature = JSON.stringify(activeFilters);
      const hasRows = records.length > 0;
      const snapshotKey = `${filterRefreshKey}:${signature}:${hasRows ? "loaded" : "empty"}`;
      const cached = filterSnapshotRef.current;

      if (!cached || cached.signature !== snapshotKey) {
        const rowIds = new Set(
          records
            .filter(r =>
              Object.entries(activeFilters).every(([key, vals]) =>
                vals.includes(String(r.data[key] || ""))
              )
            )
            .map(r => r.row_id)
        );
        filterSnapshotRef.current = { signature: snapshotKey, rowIds };
      }

      const rowIds = filterSnapshotRef.current.rowIds;
      result = result.filter(r => rowIds.has(r.row_id));
    } else {
      filterSnapshotRef.current = null;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        Object.values(r.data ?? {}).some(v => String(v).toLowerCase().includes(q))
      );
    }

    if (statusColumn && statusSortIndex.unknownIndex > 0) {
      result.sort((a, b) => {
        const sa = (a.data[statusColumn] ?? "").trim();
        const sb = (b.data[statusColumn] ?? "").trim();
        const ia = statusSortIndex.map[sa] ?? statusSortIndex.unknownIndex;
        const ib = statusSortIndex.map[sb] ?? statusSortIndex.unknownIndex;
        return ia - ib;
      });
    }

    return result;
  }, [records, search, activeFilters, statusMaster, statusSortIndex, filterRefreshKey]);

  return { filteredRecords, activeFilters };
}
