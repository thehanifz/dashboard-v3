import { useMemo } from "react";
import { useTaskStore } from "../../state/taskStore";
import { useAppearanceStore } from "../../state/appearanceStore";
import { getColorTheme } from "../../utils/colorPalette";
import { calcAging, AGING_TIER_STYLES } from "../../utils/aging";

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, icon }: {
  label: string; value: number | string; sub?: string;
  accent: string; icon: React.ReactNode;
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

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Tidak ada data</div>;

  const R = 42; const C = 2 * Math.PI * R;
  let cum = 0;
  const segs = data.filter(d => d.value > 0).map(d => {
    const pct = d.value / total * 100;
    const off = cum; cum += pct;
    return { ...d, pct, off };
  });

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg width="110" height="110" viewBox="0 0 110 110" className="-rotate-90">
          <circle cx="55" cy="55" r={R} fill="none" stroke="var(--border)" strokeWidth="14" />
          {segs.map((s, i) => (
            <circle key={i} cx="55" cy="55" r={R} fill="none" stroke={s.color}
              strokeWidth="14"
              strokeDasharray={`${(s.pct / 100) * C} ${C}`}
              strokeDashoffset={-((s.off / 100) * C)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>{total}</span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>total</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-xs flex-1 truncate" style={{ color: "var(--text-secondary)" }} title={s.label}>{s.label}</span>
            <span className="text-xs font-bold ml-1 font-mono-data" style={{ color: "var(--text-primary)" }}>{s.value}</span>
            <span className="text-[10px] w-8 text-right" style={{ color: "var(--text-muted)" }}>{s.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal Bar ───────────────────────────────────────────────────────────
function HBar({ label, value, max, color, pct }: { label: string; value: number; max: number; color: string; pct?: string }) {
  const w = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-32 truncate shrink-0" style={{ color: "var(--text-secondary)" }} title={label}>{label}</span>
      <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-5 text-right font-mono-data" style={{ color: "var(--text-primary)" }}>{value}</span>
      {pct && <span className="text-[10px] w-8 text-right" style={{ color: "var(--text-muted)" }}>{pct}</span>}
    </div>
  );
}

// ─── Aging Tier Row ───────────────────────────────────────────────────────────
const AGING_COLORS = { safe: "#10b981", warning: "#f59e0b", danger: "#f97316", critical: "#ef4444" } as const;

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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
export default function SummaryDashboard() {
  const records      = useTaskStore(s => s.records);
  const statusMaster = useTaskStore(s => s.statusMaster);
  const columnColors = useAppearanceStore(s => s.columnColors);

  const statusCol = statusMaster?.status_column ?? "StatusPekerjaan";
  const tglCol    = "TGL TERBIT PA";

  // ─── Stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byRegional: Record<string, number> = {};
    const byLayanan: Record<string, number> = {};
    const agingTiers = { safe: 0, warning: 0, danger: 0, critical: 0 };

    records.forEach(r => {
      const status   = r.data[statusCol] || "Tidak Diketahui";
      const regional = r.data["REGIONAL"] || "Lainnya";
      const layanan  = (r.data["LAYANAN"] || "Lainnya").split(" - ")[0].trim();

      byStatus[status]     = (byStatus[status] || 0) + 1;
      byRegional[regional] = (byRegional[regional] || 0) + 1;
      byLayanan[layanan]   = (byLayanan[layanan] || 0) + 1;

      const aging = calcAging(r.data[tglCol]);
      if (aging) agingTiers[aging.tier]++;
    });

    const total    = records.length;
    const done     = byStatus["Done BAI"] || 0;
    const onProg   = total - done; // Semua kecuali Done BAI
    const donePct  = total > 0 ? Math.round((done / total) * 100) : 0;

    return { byStatus, byRegional, byLayanan, agingTiers, total, done, onProg, donePct };
  }, [records, statusCol]);

  // ─── Chart data: urutan ikut statusMaster.primary ─────────────────────
  const CHART_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#84cc16","#14b8a6"];

  const statusChartData = useMemo(() => {
    const orderedStatuses = statusMaster?.primary ?? Object.keys(stats.byStatus);
    return orderedStatuses
      .filter(s => stats.byStatus[s] > 0)
      .map((s, i) => ({
        label: s,
        value: stats.byStatus[s],
        color: (() => { const theme = getColorTheme(columnColors[s]); return theme.id !== "gray" ? CHART_COLORS[i % CHART_COLORS.length] : CHART_COLORS[i % CHART_COLORS.length]; })(),
      }));
  }, [stats.byStatus, statusMaster, columnColors]);

  const maxRegional = Math.max(...Object.values(stats.byRegional), 1);
  const maxLayanan  = Math.max(...Object.values(stats.byLayanan), 1);
  const totalRegional = Object.values(stats.byRegional).reduce((a, b) => a + b, 0);
  const totalLayanan  = Object.values(stats.byLayanan).reduce((a, b) => a + b, 0);

  const agingChartData = (Object.entries(stats.agingTiers) as [keyof typeof AGING_TIER_STYLES, number][])
    .map(([tier, value]) => ({
      label: AGING_TIER_STYLES[tier].label, value, color: AGING_COLORS[tier],
    }));

  // ─── Progress bar ─────────────────────────────────────────────────────
  const progressPct = stats.donePct;

  return (
    <div className="p-4 md:p-5 space-y-4 overflow-auto h-full custom-scrollbar view-enter pb-20 md:pb-5">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard label="Total PA" value={stats.total} sub="Semua record aktif" accent="#3b82f6"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <KpiCard label="Done BAI" value={stats.done} sub={`${stats.donePct}% selesai`} accent="#10b981"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="On Progress" value={stats.onProg} sub="Semua selain Done BAI" accent="#f59e0b"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="Aging Kritis" value={stats.agingTiers.critical} sub=">90 hari berjalan" accent="#ef4444"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      {/* Progress Bar Completion */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Progress Penyelesaian</h3>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Done BAI dari total PA</p>
          </div>
          <span className="text-2xl font-extrabold" style={{ color: progressPct >= 70 ? "#10b981" : progressPct >= 40 ? "#f59e0b" : "#ef4444" }}>
            {progressPct}%
          </span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPct}%`,
              background: progressPct >= 70 ? "linear-gradient(90deg, #10b981, #34d399)"
                : progressPct >= 40 ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                : "linear-gradient(90deg, #ef4444, #f87171)"
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{stats.done} Done BAI</span>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{stats.onProg} On Progress</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">

        {/* Distribusi Status — urutan dari statusMaster.primary */}
        <SectionCard title="Distribusi Status" subtitle="Urutan sesuai pipeline">
          <DonutChart data={statusChartData} />
        </SectionCard>

        {/* Per Regional */}
        <SectionCard title="Per Regional" subtitle="Distribusi wilayah">
          <div className="space-y-2.5">
            {Object.entries(stats.byRegional)
              .sort((a, b) => b[1] - a[1])
              .map(([reg, count], i) => (
                <HBar key={reg} label={reg} value={count} max={maxRegional}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                  pct={`${Math.round(count / totalRegional * 100)}%`}
                />
              ))}
          </div>
        </SectionCard>

        {/* Per Layanan */}
        <SectionCard title="Per Layanan" subtitle="Jenis layanan">
          <div className="space-y-2.5">
            {Object.entries(stats.byLayanan)
              .sort((a, b) => b[1] - a[1])
              .map(([lay, count], i) => (
                <HBar key={lay} label={lay} value={count} max={maxLayanan}
                  color={CHART_COLORS[(i + 3) % CHART_COLORS.length]}
                  pct={`${Math.round(count / totalLayanan * 100)}%`}
                />
              ))}
          </div>
        </SectionCard>
      </div>

      {/* Aging Distribution */}
      <SectionCard title="Distribusi Aging PA" subtitle="Berdasarkan durasi dari Tgl Terbit PA hingga hari ini">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(stats.agingTiers) as [keyof typeof AGING_TIER_STYLES, number][]).map(([tier, count]) => {
            const s = AGING_TIER_STYLES[tier];
            const pct = stats.total > 0 ? Math.round(count / stats.total * 100) : 0;
            return (
              <div key={tier} className="rounded-xl p-4 text-center" style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)" }}>
                <div className="w-2.5 h-2.5 rounded-full mx-auto mb-2" style={{ background: AGING_COLORS[tier] }} />
                <p className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{count}</p>
                <p className="text-[11px] font-semibold mt-1" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{pct}% dari total</p>
              </div>
            );
          })}
        </div>
      </SectionCard>

    </div>
  );
}
