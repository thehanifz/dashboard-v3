import { useMemo, useState, useEffect, useCallback } from "react";
import { useTaskStore }      from "../../state/taskStore";
import { useAuthStore }      from "../../state/authStore";
import { calcAging, getAgingTierStyles, DEFAULT_THRESHOLDS } from "../../utils/aging";
import type { AgingThresholds }  from "../../utils/aging";
import { settingsApi }           from "../../services/settingsApi";

const AGING_COLORS = { safe: "#10b981", warning: "#f59e0b", danger: "#f97316", critical: "#ef4444" } as const;
const CHART_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#84cc16","#14b8a6"];

// ─── KPI Card ─────────────────────────────────────────────────────────────────
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

// ─── Horizontal Bar ───────────────────────────────────────────────────────────
function HBar({ label, value, max, color, pct }: {
  label: string; value: number; max: number; color: string; pct?: string;
}) {
  const w = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-36 truncate shrink-0" style={{ color: "var(--text-secondary)" }} title={label}>{label}</span>
      <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-5 text-right font-mono-data" style={{ color: "var(--text-primary)" }}>{value}</span>
      {pct && <span className="text-[10px] w-8 text-right" style={{ color: "var(--text-muted)" }}>{pct}</span>}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
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

// ─── Aging Threshold Modal ─────────────────────────────────────────────────────
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SummaryDashboard() {
  const records  = useTaskStore(s => s.records);
  const { user } = useAuthStore();

  const [thresholds, setThresholds]         = useState<AgingThresholds>(DEFAULT_THRESHOLDS);
  const [showAgingSettings, setShowAging]   = useState(false);
  const tglCol = "TGL TERBIT PA";

  // Fetch threshold dari backend saat mount
  useEffect(() => {
    settingsApi.getAgingThresholds()
      .then(setThresholds)
      .catch(() => {}); // fallback ke default
  }, []);

  const handleSaveThresholds = async (t: AgingThresholds) => {
    await settingsApi.updateAgingThresholds(t);
    setThresholds(t);
  };

  const tierStyles = useMemo(() => getAgingTierStyles(thresholds), [thresholds]);

  // ─── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const byStatusPekerjaan: Record<string, number> = {};
    const byLayanan:         Record<string, number> = {};
    const byJenisMutasi:     Record<string, number> = {};
    const byStatusPA:        Record<string, number> = {};
    const agingTiers = { safe: 0, warning: 0, danger: 0, critical: 0 };

    records.forEach(r => {
      // Status Pekerjaan — hanya yang Status PA = On Progress
      if ((r.data["Status PA"] || "") === "On Progress") {
        const sp = r.data["Status Pekerjaan"] || "Tidak Diketahui";
        byStatusPekerjaan[sp] = (byStatusPekerjaan[sp] || 0) + 1;
      }

      // STATUS PA
      const spa = r.data["Status PA"] || "Tidak Diketahui";
      byStatusPA[spa] = (byStatusPA[spa] || 0) + 1;

      // Layanan — ambil bagian pertama sebelum " - "
      const layanan = (r.data["LAYANAN"] || "Lainnya").split(" - ")[0].trim();
      byLayanan[layanan] = (byLayanan[layanan] || 0) + 1;

      // Jenis Mutasi
      const mutasi = r.data["JENIS MUTASI"] || "Lainnya";
      byJenisMutasi[mutasi] = (byJenisMutasi[mutasi] || 0) + 1;

      // Aging
      const aging = calcAging(r.data[tglCol], thresholds);
      if (aging) agingTiers[aging.tier]++;
    });

    const total      = records.length;
    const doneBai    = byStatusPA["Done BAI"]    || 0;
    const onProgress = byStatusPA["On Progress"] || 0;
    const paCancel   = byStatusPA["PA Cancel"]   || 0;
    const donePct    = total > 0 ? Math.round((doneBai / total) * 100) : 0;

    return {
      byStatusPekerjaan, byLayanan, byJenisMutasi, byStatusPA,
      agingTiers, total, doneBai, onProgress, paCancel, donePct,
    };
  }, [records, thresholds]);

  const maxSP     = Math.max(...Object.values(stats.byStatusPekerjaan), 1);
  const maxLayanan = Math.max(...Object.values(stats.byLayanan), 1);
  const maxMutasi  = Math.max(...Object.values(stats.byJenisMutasi), 1);
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
        <KpiCard label="Done BAI" value={stats.doneBai} sub={`${stats.donePct}% selesai`} accent="#10b981"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="On Progress" value={stats.onProgress} sub="Status PA = On Progress" accent="#f59e0b"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="PA Cancel" value={stats.paCancel} sub="Status PA = PA Cancel" accent="#ef4444"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* ── Progress Bar — by STATUS PA Done BAI ── */}
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
        <div className="flex justify-between mt-2">
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{stats.doneBai} Done BAI</span>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{stats.onProgress} On Progress · {stats.paCancel} PA Cancel</span>
        </div>
      </div>

      {/* ── Chart Row — 3 Bar Horizontal ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">

        {/* Per Status Pekerjaan */}
        <SectionCard title="Per Status Pekerjaan On Progress" subtitle="Filter: Status PA = On Progress">
          <div className="space-y-2.5">
            {Object.entries(stats.byStatusPekerjaan)
              .sort((a, b) => b[1] - a[1])
              .map(([sp, count], i) => (
                <HBar key={sp} label={sp} value={count} max={maxSP}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                  pct={`${Math.round(count / totalSP * 100)}%`}
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
                  pct={`${Math.round(count / totalLay * 100)}%`}
                />
              ))}
          </div>
        </SectionCard>

        {/* Per Jenis Mutasi */}
        <SectionCard title="Per Jenis Mutasi" subtitle="Kolom JENIS MUTASI">
          <div className="space-y-2.5">
            {Object.entries(stats.byJenisMutasi)
              .sort((a, b) => b[1] - a[1])
              .map(([mut, count], i) => (
                <HBar key={mut} label={mut} value={count} max={maxMutasi}
                  color={CHART_COLORS[(i + 6) % CHART_COLORS.length]}
                  pct={`${Math.round(count / totalMut * 100)}%`}
                />
              ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Distribusi Aging — dengan tombol pengaturan ── */}
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

      {/* Modal pengaturan aging */}
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