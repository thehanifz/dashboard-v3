import { useMemo } from "react";
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
  statusMaster: StatusMaster | null
) {
  const activeFilters = useAppearanceStore(s => s.activeFilters);

  const statusSortIndex = useMemo(() => {
    const primary = statusMaster?.primary ?? [];
    const map: Record<string, number> = {};
    primary.forEach((s, i) => { map[s] = i; });
    return { map, unknownIndex: primary.length };
  }, [statusMaster]);

  const filteredRecords = useMemo(() => {
    const statusColumn = statusMaster?.status_column ?? "";
    let result = [...records];

    if (Object.keys(activeFilters).length > 0) {
      result = result.filter(r =>
        Object.entries(activeFilters).every(([key, vals]) =>
          vals.includes(String(r.data[key] || ""))
        )
      );
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
  }, [records, search, activeFilters, statusMaster, statusSortIndex]);

  return { filteredRecords, activeFilters };
}
