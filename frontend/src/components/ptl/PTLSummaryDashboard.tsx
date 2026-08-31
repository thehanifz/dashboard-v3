/**
 * PTLSummaryDashboard.tsx
 * Dashboard statistik PTL — tampilan sama dengan Engineer.
 * Data dari GSheet PTL sendiri (props records dari PTLDashboardPanel).
 * Threshold aging dibaca dari backend (read-only untuk PTL).
 *
 * Interaktif: klik KPI card / bar / aging tile → drill down ke PTL Detail
 * dengan filter otomatis terapasang.
 */
import { useMemo, useState, useEffect } from "react";
import { calcAging, getAgingTierStyles, DEFAULT_THRESHOLDS } from "../../utils/aging";
import type { AgingThresholds } from "../../utils/aging";
import { getAgingThresholds } from "../../services/settingsApi";
import { useAppStore } from "../../state/appStore";
import type { SheetRecord } from "../../state/taskStore";

const AGING_COLORS = { safe: "#10b981", warning: "#f59e0b", danger: "#f97316", critical: "#ef4444" } as const;
const CHART_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#84cc16","#14b8a6"];

interface Props {
  records: SheetRecord[];
  loading?: boolean;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, icon, onClick, clickable }: {
  label: string; value: number | string; sub?: string; accent: string; icon: React.ReactNode;
  onClick?: () => void; clickable?: boolean;
}) {
  return (
    <div
      className="kpi-card"
      onClick={onClick}
      style={{
        cursor: clickable ? "pointer" : undefined,
        transition: "box-shadow 150ms, transform 150ms",
      }}
      onMouseEnter={e => {
        if (!clickable) return;
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        if (!clickable) return;
        (e.currentTarget as HTMLElement).style.boxShadow = "";
        (e.currentTarget as HTMLElement).style.transform = "";
      }}
      title={clickable ? `Klik untuk lihat detail` : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="kpi-icon w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accent + "22" }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        {clickable && (
          <svg className="w-3.5 h-3.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            style={{ color: accent }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      <p className="kpi-value text-3xl font-extrabold leading-none" style={{ color: "var(--text-primary)" }}>{value}</p>
      <p className="kpi-label text-xs font-semibold mt-1.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
      {sub && <p className="kpi-sub text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

// ─── Horizontal Bar — clickable ───────────────────────────────────────────────
function HBar({ label, value, max, color, pct, onClick }: {
  label: string; value: number; max: number; color: string; pct?: string;
  onClick?: () => void;
}) {
  const w = max > 0 ? (value / max) * 100 : 0;
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-1"
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : undefined,
        transition: "background 120ms",
        margin: "0 -4px",
        padding: "3px 4px",
      }}
      onMouseEnter={e => {
        if (!onClick) return;
        (e.currentTarget as HTMLElement).style.background = "var(--bg-surface2)";
      }}
      onMouseLeave={e => {
        if (!onClick) return;
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
      title={onClick ? `Klik untuk filter: ${label}` : undefined}
    >
      <span className="text-xs w-36 truncate shrink-0" style={{ color: "var(--text-secondary)" }} title={label}>{label}</span>
      <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-5 text-right font-mono-data" style={{ color: "var(--text-primary)" }}>{value}</span>
      {pct && <span className="text-[10px] w-8 text-right" style={{ color: "var(--text-muted)" }}>{pct}</span>}
      {onClick && (
        <svg className="w-3 h-3 shrink-0 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="mb-4">
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</h3>
        {subtitle && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PTLSummaryDashboard({ records, loading }: Props) {
  const [thresholds, setThresholds] = useState<AgingThresholds>(DEFAULT_THRESHOLDS);
  const tglCol    = "TGL TERBIT PA";
  const baiCol    = "TGL UPLOAD BAI";
  const statusCol = "Status PA";

  const drillToPtlDetail = useAppStore(s => s.drillToPtlDetail);

  // Fetch threshold dari backend saat mount (read-only untuk PTL)
  useEffect(() => {
    getAgingThresholds()
      .then(setThresholds)
      .catch(() => {});
  }, []);

  const tierStyles = useMemo(() => getAgingTierStyles(thresholds), [thresholds]);

  // ─── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const byStatusPekerjaan: Record<string, number> = {};
    const byLayanan:         Record<string, number> = {};
    const byJenisMutasi:     Record<string, number> = {};
    const byStatusPA:        Record<string, number> = {};
    const agingTiers = { safe: 0, warning: 0, danger: 0, critical: 0 };
    const agingRowIds: Record<string, number[]> = { safe: [], warning: [], danger: [], critical: [] };

    records.forEach(r => {
      // Status Pekerjaan — hanya yang Status PA = On Progress
      if ((r.data[statusCol] || "") === "On Progress") {
        const sp = r.data["Status Pekerjaan"] || "Tidak Diketahui";
        byStatusPekerjaan[sp] = (byStatusPekerjaan[sp] || 0) + 1;
      }

      const spa = r.data[statusCol] || "Tidak Diketahui";
      byStatusPA[spa] = (byStatusPA[spa] || 0) + 1;

      const layanan = (r.data["LAYANAN"] || "Lainnya").split(" - ")[0].trim();
      byLayanan[layanan] = (byLayanan[layanan] || 0) + 1;

      const mutasi = r.data["JENIS MUTASI"] || "Lainnya";
      byJenisMutasi[mutasi] = (byJenisMutasi[mutasi] || 0) + 1;

      // Aging: freeze saat Done BAI, live saat On Progress
      const aging = calcAging(
        r.data[tglCol],
        thresholds,
        r.data[baiCol],
        r.data[statusCol]
      );
      if (aging) {
        agingTiers[aging.tier]++;
        agingRowIds[aging.tier].push(r.row_id);
      }
    });

    const total      = records.length;
    const doneBai    = byStatusPA["Done BAI"]    || 0;
    const onProgress = byStatusPA["On Progress"] || 0;
    const paCancel   = byStatusPA["PA Cancel"]   || 0;
    const donePct    = total > 0 ? Math.round((doneBai / total) * 100) : 0;

    return {
      byStatusPekerjaan, byLayanan, byJenisMutasi, byStatusPA,
      agingTiers, agingRowIds, total, doneBai, onProgress, paCancel, donePct,
    };
  }, [records, thresholds]);

  const maxSP      = Math.max(...Object.values(stats.byStatusPekerjaan), 1);
  const maxLayanan = Math.max(...Object.values(stats.byLayanan), 1);
  const maxMutasi  = Math.max(...Object.values(stats.byJenisMutasi), 1);
  const totalSP    = Object.values(stats.byStatusPekerjaan).reduce((a, b) => a + b, 0);
  const totalLay   = Object.values(stats.byLayanan).reduce((a, b) => a + b, 0);
  const totalMut   = Object.values(stats.byJenisMutasi).reduce((a, b) => a + b, 0);

  // ─── Drill handlers ───────────────────────────────────────────────────────
  const drillByStatusPA = (value: string) =>
    drillToPtlDetail({ column: "Status PA", values: [value], label: `Status PA = ${value}` });

  const drillByStatusPekerjaan = (value: string) =>
    drillToPtlDetail({
      column: "Status Pekerjaan",
      values: [value],
      label: `Status Pekerjaan = ${value} (On Progress)`,
    });

  const drillByLayanan = (value: string) => {
    const uniqVals = [...new Set(
      records
        .map(r => r.data["LAYANAN"] || "")
        .filter(v => v.split(" - ")[0].trim() === value)
    )];
    drillToPtlDetail({
      column: "LAYANAN",
      values: uniqVals.length > 0 ? uniqVals : [value],
      label: `Layanan = ${value}`,
    });
  };

  const drillByMutasi = (value: string) =>
    drillToPtlDetail({ column: "JENIS MUTASI", values: [value], label: `Jenis Mutasi = ${value}` });

  const drillByAging = (tier: string, label: string) =>
    drillToPtlDetail({ column: "__aging_tier", values: [tier], label: `Aging: ${label}` });

  if (loading && records.length === 0) {
    return (
      <div className="p-4 md:p-5 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl h-24 animate-pulse" style={{ background: "var(--bg-surface)" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5 space-y-4 overflow-auto h-full custom-scrollbar view-enter pb-20 md:pb-5">

      {/* ── KPI Cards — by Status PA ── */}
      <div className="kpi-grid grid grid-cols-4 gap-1.5 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3 md:gap-4">
        <KpiCard label="Total PA" value={stats.total} sub="Semua record aktif" accent="#3b82f6"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <KpiCard label="Done BAI" value={stats.doneBai} sub={`${stats.donePct}% selesai`} accent="#10b981"
          clickable onClick={() => drillByStatusPA("Done BAI")}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="On Progress" value={stats.onProgress} sub="Status PA = On Progress" accent="#f59e0b"
          clickable onClick={() => drillByStatusPA("On Progress")}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="PA Cancel" value={stats.paCancel} sub="Status PA = PA Cancel" accent="#ef4444"
          clickable onClick={() => drillByStatusPA("PA Cancel")}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* ── Progress Bar ── */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Progress Penyelesaian</h3>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Status PA: Done BAI dari total PA</p>
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
        <div className="flex flex-col gap-1 mt-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{stats.doneBai} Done BAI</span>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{stats.onProgress} On Progress · {stats.paCancel} PA Cancel</span>
        </div>
      </div>

      {/* ── Chart Row — 3 Bar Horizontal ── */}
      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">

        <SectionCard title="Per Status Pekerjaan On Progress" subtitle="Klik bar untuk filter tabel">
          <div className="space-y-1">
            {Object.entries(stats.byStatusPekerjaan)
              .sort((a, b) => b[1] - a[1])
              .map(([sp, count], i) => (
                <HBar key={sp} label={sp} value={count} max={maxSP}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                  pct={`${Math.round(count / totalSP * 100)}%`}
                  onClick={() => drillByStatusPekerjaan(sp)}
                />
              ))}
          </div>
        </SectionCard>

        <SectionCard title="Per Layanan" subtitle="Klik bar untuk filter tabel">
          <div className="space-y-1">
            {Object.entries(stats.byLayanan)
              .sort((a, b) => b[1] - a[1])
              .map(([lay, count], i) => (
                <HBar key={lay} label={lay} value={count} max={maxLayanan}
                  color={CHART_COLORS[(i + 3) % CHART_COLORS.length]}
                  pct={`${Math.round(count / totalLay * 100)}%`}
                  onClick={() => drillByLayanan(lay)}
                />
              ))}
          </div>
        </SectionCard>

        <SectionCard title="Per Jenis Mutasi" subtitle="Klik bar untuk filter tabel">
          <div className="space-y-1">
            {Object.entries(stats.byJenisMutasi)
              .sort((a, b) => b[1] - a[1])
              .map(([mut, count], i) => (
                <HBar key={mut} label={mut} value={count} max={maxMutasi}
                  color={CHART_COLORS[(i + 6) % CHART_COLORS.length]}
                  pct={`${Math.round(count / totalMut * 100)}%`}
                  onClick={() => drillByMutasi(mut)}
                />
              ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Distribusi Aging — tiles clickable ── */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Distribusi Aging PA</h3>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {`Tier: ≤${thresholds.tier1}h · ≤${thresholds.tier2}h · ≤${thresholds.tier3}h · >${thresholds.tier3}h`}
            {" · "}<span style={{ color: "var(--accent)", fontWeight: 600 }}>Klik tier untuk filter tabel</span>
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["safe", "warning", "danger", "critical"] as const).map(tier => {
            const count = stats.agingTiers[tier];
            const s     = tierStyles[tier];
            const pct   = stats.total > 0 ? Math.round(count / stats.total * 100) : 0;
            return (
              <div key={tier}
                className="rounded-xl p-4 text-center"
                onClick={() => drillByAging(tier, s.label)}
                style={{
                  background: "var(--bg-surface2)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "box-shadow 150ms, transform 150ms",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${AGING_COLORS[tier]}33`;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                  (e.currentTarget as HTMLElement).style.transform = "";
                }}
                title={`Klik untuk filter tabel: aging ${s.label}`}
              >
                <div className="w-2.5 h-2.5 rounded-full mx-auto mb-2" style={{ background: AGING_COLORS[tier] }} />
                <p className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{count}</p>
                <p className="text-[11px] font-semibold mt-1" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{pct}% dari total</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
