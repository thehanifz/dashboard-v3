import { useMemo, useState, useEffect } from "react";
import { useTaskStore }      from "../../state/taskStore";
import { useAuthStore }      from "../../state/authStore";
import { useAppearanceStore } from "../../state/appearanceStore";
import { useAppStore }        from "../../state/appStore";
import { calcAging, getAgingTierStyles, DEFAULT_THRESHOLDS } from "../../utils/aging";
import type { AgingThresholds }  from "../../utils/aging";
import {
  getAgingThresholds,
  getDashboardColumns,
  type DashboardColumns,
} from "../../services/settingsApi";
import { HBar } from "./HBar";

const AGING_COLORS = { safe: "#10b981", warning: "#f59e0b", danger: "#f97316", critical: "#ef4444" } as const;
const CHART_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#84cc16","#14b8a6"];

// ─── KPI Card ───────────────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, icon }: {
  label: string; value: number | string; sub?: string; accent: string; icon: React.ReactNode;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accent + "22" }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
      </div>
      <p className="text-3xl font-extrabold leading-none" style={{ color: "var(--text-primary)" }}>{value}</p>
      <p className="text-xs font-semibold mt-1.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, action, children }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</h3>
          {subtitle && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Aging Threshold Modal ──────────────────────────────────────────────────────────────────
function AgingSettingsModal({ thresholds, onSave, onClose }: {
  thresholds: AgingThresholds;
  onSave: (t: AgingThresholds) => Promise<void>;
  onClose: () => void;
}) {
  const [t1, setT1] = useState(String(thresholds.tier1));
  const [t2, setT2] = useState(String(thresholds.tier2));
  const [t3, setT3] = useState(String(thresholds.tier3));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const handleSave = async () => {
    const n1 = parseInt(t1), n2 = parseInt(t2), n3 = parseInt(t3);
    if (!n1 || !n2 || !n3 || n1 <= 0 || n2 <= n1 || n3 <= n2) {
      setError("Harus: Tier 1 < Tier 2 < Tier 3 dan semua > 0");
      return;
    }
    setSaving(true);
    try {
      await onSave({ tier1: n1, tier2: n2, tier3: n3 });
      onClose();
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: "var(--input-bg)", border: "1px solid var(--input-border)",
    color: "var(--text-primary)", borderRadius: 8, padding: "6px 10px",
    fontSize: 13, outline: "none", width: "80px", textAlign: "center" as const,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Pengaturan Aging</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Batas hari per tier</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {[
            { label: "Tier 1 — Safe s.d.", color: AGING_COLORS.safe, val: t1, set: setT1, hint: "hari" },
            { label: "Tier 2 — Warning s.d.", color: AGING_COLORS.warning, val: t2, set: setT2, hint: "hari" },
            { label: "Tier 3 — Danger s.d.", color: AGING_COLORS.danger, val: t3, set: setT3, hint: "hari" },
          ].map(({ label, color, val, set, hint }) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input type="number" min="1" value={val} onChange={e => set(e.target.value)} style={inputStyle} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 text-[11px] px-1" style={{ color: "var(--text-muted)" }}>
          Critical = lebih dari Tier 3 hari
        </div>

        {error && (
          <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: "var(--bg-surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            Batal
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--accent)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────────────
export default function SummaryDashboard() {
  const records  = useTaskStore(s => s.records);
  const { user } = useAuthStore();

  const [thresholds, setThresholds]       = useState<AgingThresholds>(DEFAULT_THRESHOLDS);
  const [showAgingSettings, setShowAging] = useState(false);
  const [cols, setCols] = useState<DashboardColumns | null>(null);

  // Dashboard interactive filter — state lokal, sync langsung ke Zustand store
  const [dashboardFilter, setDashboardFilter] = useState<{
    column: string;
    value: string;
  } | null>(null);

  useEffect(() => {
    getAgingThresholds().then(setThresholds).catch(() => {});
  }, []);

  useEffect(() => {
    getDashboardColumns().then(setCols).catch(() => {});
  }, []);

  const handleSaveThresholds = async (t: AgingThresholds) => {
    setThresholds(t);
  };

  const tierStyles = useMemo(() => getAgingTierStyles(thresholds), [thresholds]);

  // Handler untuk bar click — set filter lalu auto navigate ke halaman tabel (detail)
  const handleBarClick = (column: string, value: string) => {
    setDashboardFilter(prev => {
      if (prev?.column === column && prev?.value === value) {
        // Toggle off — clear filter di store, tetap di halaman ini
        useAppearanceStore.getState().clearFilters();
        return null;
      }
      // Set filter baru di store
      useAppearanceStore.getState().setActiveFilters({ [column]: [value] });
      // Auto navigate ke halaman tabel
      useAppStore.getState().setPage("detail");
      return { column, value };
    });
  };

  // Clear filter handler
  const handleClearFilter = () => {
    setDashboardFilter(null);
    useAppearanceStore.getState().clearFilters();
  };

  // ─── Deteksi nilai status dinamis dari data GSheet ──────────────────────────
  const statusPaValues = useMemo(() => {
    const statusPaCol = cols?.colStatusPa ?? "Status PA";
    const counts: Record<string, number> = {};
    records.forEach(r => {
      const v = (r.data[statusPaCol] || "").trim();
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [records, cols]);

  const detectedStatus = useMemo(() => {
    const keys = statusPaValues.map(([k]) => k);
    const exactMatch = (candidates: string[]) =>
      candidates.find(c => keys.includes(c)) ?? "";
    return {
      done:     exactMatch(["Done BAI", "done bai", "DONE BAI"]) || "Done BAI",
      progress: exactMatch(["On Progress", "on progress", "ON PROGRESS"]) || "On Progress",
      cancel:   exactMatch(["PA Cancel", "pa cancel", "PA CANCEL"]) || "PA Cancel",
    };
  }, [statusPaValues]);

  // ─── Stats ─────────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const tglCol         = cols?.colTglTerbit       ?? "TGL TERBIT PA";
    const statusPaCol    = cols?.colStatusPa        ?? "Status PA";
    const statusPekCol   = cols?.colStatusPekerjaan ?? "Status Pekerjaan";
    const jenisMutasiCol = "JENIS PEKERJAAN";

    const valDone     = detectedStatus.done;
    const valProgress = detectedStatus.progress;
    const valCancel   = detectedStatus.cancel;

    const byStatusPekerjaan: Record<string, number> = {};
    const byLayanan:         Record<string, number> = {};
    const byJenisMutasi:     Record<string, number> = {};
    const byStatusPA:        Record<string, number> = {};
    const byNamaCustomer:    Record<string, number> = {};
    const byPtlUpdate:       Record<string, number> = {};
    const bySegmentasi:      Record<string, number> = {};
    const agingTiers = { safe: 0, warning: 0, danger: 0, critical: 0 };

    records.forEach(r => {
      if (valProgress && (r.data[statusPaCol] || "").trim() === valProgress) {
        const sp = r.data[statusPekCol] || "Tidak Diketahui";
        byStatusPekerjaan[sp] = (byStatusPekerjaan[sp] || 0) + 1;
      }

      const spa = (r.data[statusPaCol] || "Tidak Diketahui").trim();
      byStatusPA[spa] = (byStatusPA[spa] || 0) + 1;

      const layanan = r.data["KATEGORI LAYANAN"] || "Lainnya";
      byLayanan[layanan] = (byLayanan[layanan] || 0) + 1;

      const mutasi = r.data[jenisMutasiCol] || "Lainnya";
      byJenisMutasi[mutasi] = (byJenisMutasi[mutasi] || 0) + 1;

      const namaCustomer = r.data["NAMA CUSTOMER"] || "Tidak Diketahui";
      byNamaCustomer[namaCustomer] = (byNamaCustomer[namaCustomer] || 0) + 1;

      const ptlUpdateRaw = r.data["PTL Update"] || "";
      if (ptlUpdateRaw && ptlUpdateRaw.trim()) {
        const ptlUpdate = ptlUpdateRaw.trim();
        byPtlUpdate[ptlUpdate] = (byPtlUpdate[ptlUpdate] || 0) + 1;
      }

      const segmentasi = r.data["SEGMENTASI"] || "Tidak Diketahui";
      bySegmentasi[segmentasi] = (bySegmentasi[segmentasi] || 0) + 1;

      const tglTerbit    = r.data[tglCol];
      const tglUploadBAI = r.data["TGL UPLOAD BAI"];
      const aging = calcAging(tglTerbit, thresholds, tglUploadBAI);
      if (aging) agingTiers[aging.tier]++;
    });

    const total      = records.length;
    const doneBai    = valDone     ? (byStatusPA[valDone]     || 0) : 0;
    const onProgress = valProgress ? (byStatusPA[valProgress] || 0) : 0;
    const paCancel   = valCancel   ? (byStatusPA[valCancel]   || 0) : 0;
    const donePct    = total > 0 ? Math.round((doneBai / total) * 100) : 0;

    return {
      byStatusPekerjaan, byLayanan, byJenisMutasi, byStatusPA,
      byNamaCustomer, byPtlUpdate, bySegmentasi,
      agingTiers, total, doneBai, onProgress, paCancel, donePct,
      valDone, valProgress, valCancel,
      allStatusPaValues: statusPaValues,
    };
  }, [records, thresholds, cols, detectedStatus, statusPaValues]);

  const maxSP         = Math.max(...Object.values(stats.byStatusPekerjaan), 1);
  const maxLayanan    = Math.max(...Object.values(stats.byLayanan), 1);
  const maxMutasi     = Math.max(...Object.values(stats.byJenisMutasi), 1);
  const maxCustomer   = Math.max(...Object.values(stats.byNamaCustomer), 1);
  const maxPtlUpdate  = Math.max(...Object.values(stats.byPtlUpdate), 1);
  const maxSegmentasi = Math.max(...Object.values(stats.bySegmentasi), 1);
  const totalSP    = Object.values(stats.byStatusPekerjaan).reduce((a, b) => a + b, 0);
  const totalLay   = Object.values(stats.byLayanan).reduce((a, b) => a + b, 0);
  const totalMut   = Object.values(stats.byJenisMutasi).reduce((a, b) => a + b, 0);

  const isEngineer = user?.role === "engineer";

  return (
    <div className="p-4 md:p-5 space-y-4 overflow-auto h-full custom-scrollbar view-enter pb-20 md:pb-5">

      {/* ── KPI Cards — by STATUS PA ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard label="Total PA" value={stats.total} sub="Semua record aktif" accent="#3b82f6"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <KpiCard
          label={stats.valDone || "Done"}
          value={stats.doneBai}
          sub={`${stats.donePct}% selesai`}
          accent="#10b981"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard
          label={stats.valProgress || "On Progress"}
          value={stats.onProgress}
          sub={stats.valProgress ? `Status PA = ${stats.valProgress}` : "Sedang berjalan"}
          accent="#f59e0b"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard
          label={stats.valCancel || "Cancel"}
          value={stats.paCancel}
          sub={stats.valCancel ? `Status PA = ${stats.valCancel}` : "Dibatalkan"}
          accent="#ef4444"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* ── Progress Bar ── */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Progress Penyelesaian</h3>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {stats.valDone ? `Status PA: ${stats.valDone} dari total PA` : "Persentase PA selesai"}
            </p>
          </div>
          <span className="text-2xl font-extrabold"
            style={{ color: stats.donePct >= 70 ? "#10b981" : stats.donePct >= 40 ? "#f59e0b" : "#ef4444" }}>
            {stats.donePct}%
          </span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${stats.donePct}%`,
              background: stats.donePct >= 70
                ? "linear-gradient(90deg, #10b981, #34d399)"
                : stats.donePct >= 40
                ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                : "linear-gradient(90deg, #ef4444, #f87171)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {stats.doneBai} {stats.valDone || "Done"}
          </span>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {stats.onProgress} {stats.valProgress || "On Progress"} · {stats.paCancel} {stats.valCancel || "Cancel"}
          </span>
        </div>
      </div>

      {/* ── Dashboard Filter Banner ── */}
      {dashboardFilter && (
        <div className="flex items-center justify-between p-3 rounded-xl"
          style={{
            background: "var(--accent-soft)",
            border: "1px solid var(--accent)",
          }}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"
              style={{ color: "var(--accent)" }}>
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              Filter aktif: <b style={{ color: "var(--accent)" }}>{dashboardFilter.column}</b> = <b style={{ color: "var(--accent)" }}>{dashboardFilter.value}</b>
            </span>
          </div>
          <button
            onClick={handleClearFilter}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "#fee2e2";
              (e.currentTarget as HTMLElement).style.color = "#ef4444";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Filter
          </button>
        </div>
      )}

      {/* ── Chart Row 1 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <SectionCard
          title={`Per ${cols?.colStatusPekerjaan ?? "Status Pekerjaan"} On Progress`}
          subtitle={`Filter: ${cols?.colStatusPa ?? "Status PA"} = ${stats.valProgress || "On Progress"}`}
        >
          <div className="space-y-2.5">
            {Object.entries(stats.byStatusPekerjaan)
              .sort((a, b) => b[1] - a[1])
              .map(([sp, count], i) => (
                <HBar
                  key={sp}
                  label={sp}
                  value={count}
                  max={maxSP}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                  pct={totalSP > 0 ? `${Math.round(count / totalSP * 100)}%` : ""}
                  onClick={() => handleBarClick("Status Pekerjaan", sp)}
                  isActive={dashboardFilter?.column === "Status Pekerjaan" && dashboardFilter?.value === sp}
                />
              ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Per KATEGORI PRODUK"
          subtitle="Kategori produk layanan"
        >
          <div className="space-y-2.5">
            {Object.entries(stats.byLayanan)
              .sort((a, b) => b[1] - a[1])
              .map(([lay, count], i) => (
                <HBar
                  key={lay}
                  label={lay}
                  value={count}
                  max={maxLayanan}
                  color={CHART_COLORS[(i + 3) % CHART_COLORS.length]}
                  pct={totalLay > 0 ? `${Math.round(count / totalLay * 100)}%` : ""}
                  onClick={() => handleBarClick("KATEGORI LAYANAN", lay)}
                  isActive={dashboardFilter?.column === "KATEGORI LAYANAN" && dashboardFilter?.value === lay}
                />
              ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Per JENIS PEKERJAAN"
          subtitle="Jenis pekerjaan"
        >
          <div className="space-y-2.5">
            {Object.entries(stats.byJenisMutasi)
              .sort((a, b) => b[1] - a[1])
              .map(([mut, count], i) => (
                <HBar
                  key={mut}
                  label={mut}
                  value={count}
                  max={maxMutasi}
                  color={CHART_COLORS[(i + 6) % CHART_COLORS.length]}
                  pct={totalMut > 0 ? `${Math.round(count / totalMut * 100)}%` : ""}
                  onClick={() => handleBarClick("JENIS PEKERJAAN", mut)}
                  isActive={dashboardFilter?.column === "JENIS PEKERJAAN" && dashboardFilter?.value === mut}
                />
              ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Chart Row 2 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <SectionCard
          title="Top 10 NAMA CUSTOMER"
          subtitle="Customer terbanyak"
        >
          <div className="space-y-2.5">
            {Object.entries(stats.byNamaCustomer)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([customer, count], i) => (
                <HBar
                  key={customer}
                  label={customer}
                  value={count}
                  max={maxCustomer}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                  pct={records.length > 0 ? `${Math.round(count / records.length * 100)}%` : ""}
                  onClick={() => handleBarClick("NAMA CUSTOMER", customer)}
                  isActive={dashboardFilter?.column === "NAMA CUSTOMER" && dashboardFilter?.value === customer}
                />
              ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Per PTL UPDATE"
          subtitle="PTL yang update"
        >
          <div className="space-y-2.5">
            {Object.entries(stats.byPtlUpdate)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([ptl, count], i) => (
                <HBar
                  key={ptl}
                  label={ptl}
                  value={count}
                  max={maxPtlUpdate}
                  color={CHART_COLORS[(i + 3) % CHART_COLORS.length]}
                  pct={records.length > 0 ? `${Math.round(count / records.length * 100)}%` : ""}
                  onClick={() => handleBarClick("PTL Update", ptl)}
                  isActive={dashboardFilter?.column === "PTL Update" && dashboardFilter?.value === ptl}
                />
              ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Per SEGMENTASI"
          subtitle="Segmentasi customer"
        >
          <div className="space-y-2.5">
            {Object.entries(stats.bySegmentasi)
              .sort((a, b) => b[1] - a[1])
              .map(([seg, count], i) => (
                <HBar
                  key={seg}
                  label={seg}
                  value={count}
                  max={maxSegmentasi}
                  color={CHART_COLORS[(i + 6) % CHART_COLORS.length]}
                  pct={records.length > 0 ? `${Math.round(count / records.length * 100)}%` : ""}
                  onClick={() => handleBarClick("SEGMENTASI", seg)}
                  isActive={dashboardFilter?.column === "SEGMENTASI" && dashboardFilter?.value === seg}
                />
              ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Distribusi Aging ── */}
      <SectionCard
        title="Distribusi Aging PA"
        subtitle={`Tier: ≤${thresholds.tier1}h · ≤${thresholds.tier2}h · ≤${thresholds.tier3}h · >${thresholds.tier3}h`}
        action={
          isEngineer ? (
            <button
              onClick={() => setShowAging(true)}
              title="Atur threshold aging"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Atur Tier
            </button>
          ) : null
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["safe", "warning", "danger", "critical"] as const).map(tier => {
            const count = stats.agingTiers[tier];
            const s     = tierStyles[tier];
            const pct   = stats.total > 0 ? Math.round(count / stats.total * 100) : 0;
            return (
              <div key={tier} className="rounded-xl p-4 text-center"
                style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
                <div className="w-2.5 h-2.5 rounded-full mx-auto mb-2" style={{ background: AGING_COLORS[tier] }} />
                <p className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{count}</p>
                <p className="text-[11px] font-semibold mt-1" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{pct}% dari total</p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {showAgingSettings && (
        <AgingSettingsModal
          thresholds={thresholds}
          onSave={handleSaveThresholds}
          onClose={() => setShowAging(false)}
        />
      )}
    </div>
  );
}
