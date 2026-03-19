/**
 * SyncDashboardPage.tsx
 * Halaman Engineer untuk monitor dan trigger Sync Engine.
 */
import { useEffect, useState } from "react";
import { syncApi, SyncLog, SyncMismatch, SyncResult } from "../services/syncApi";
import { useAppStore } from "../state/appStore";

type Tab = "overview" | "logs" | "mismatches";

export default function SyncDashboardPage() {
  const { setPage }                           = useAppStore();
  const [tab, setTab]                         = useState<Tab>("overview");
  const [syncing, setSyncing]                 = useState(false);
  const [syncResult, setSyncResult]           = useState<any>(null);
  const [logs, setLogs]                       = useState<SyncLog[]>([]);
  const [mismatches, setMismatches]           = useState<SyncMismatch[]>([]);
  const [loadingLogs, setLoadingLogs]         = useState(false);
  const [loadingMismatches, setLoadingMismatches] = useState(false);
  const [error, setError]                     = useState("");

  useEffect(() => {
    if (tab === "logs") fetchLogs();
    if (tab === "mismatches") fetchMismatches();
  }, [tab]);

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      setLogs(await syncApi.getLogs(100));
    } catch {
      setError("Gagal memuat sync logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchMismatches = async () => {
    try {
      setLoadingMismatches(true);
      setMismatches(await syncApi.getMismatches());
    } catch {
      setError("Gagal memuat mismatches");
    } finally {
      setLoadingMismatches(false);
    }
  };

  const handleRunAll = async () => {
    try {
      setSyncing(true);
      setError("");
      setSyncResult(null);
      const result = await syncApi.runAll();
      setSyncResult(result);
      if (tab === "mismatches") fetchMismatches();
    } catch (err: any) {
      const msg = err?.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Gagal menjalankan sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await syncApi.dismissMismatch(id);
      setMismatches((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError("Gagal dismiss mismatch");
    }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview",   label: "Overview" },
    { id: "logs",       label: "Sync Logs" },
    { id: "mismatches", label: `Mismatches${mismatches.length > 0 ? ` (${mismatches.length})` : ""}` },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Sync Dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Sinkronisasi data Engineer GSheet ↔ PTL GSheet
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage("dashboard")}
            className="btn-ghost rounded-xl px-4 py-2 text-sm"
          >
            ← Kembali
          </button>
          <button
            onClick={handleRunAll}
            disabled={syncing}
            className="rounded-xl px-5 py-2 text-sm font-medium text-white transition flex items-center gap-2"
            style={{ background: syncing ? "var(--text-muted)" : "var(--accent)", cursor: syncing ? "not-allowed" : "pointer" }}
          >
            {syncing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Semua PTL
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm border"
          style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>
          {error}
        </div>
      )}

      {/* Sync Result Banner */}
      {syncResult && (
        <div className="rounded-xl px-4 py-3 border space-y-1"
          style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.3)" }}>
          <p className="text-sm font-semibold" style={{ color: "#10b981" }}>
            ✓ Sync selesai — {syncResult.ptl_count} PTL diproses
          </p>
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span>Field diupdate: <b>{syncResult.total_synced}</b></span>
            <span>Mismatch baru: <b>{syncResult.total_mismatches}</b></span>
          </div>
          {syncResult.results?.filter((r: SyncResult) => !r.ok).length > 0 && (
            <div className="mt-2 space-y-1">
              {syncResult.results.filter((r: SyncResult) => !r.ok).map((r: SyncResult, i: number) => (
                <p key={i} className="text-xs" style={{ color: "#f87171" }}>
                  ✗ {r.ptl_username ?? "unknown"}: {r.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2.5 text-sm font-medium transition-all"
            style={{
              color: tab === t.id ? "var(--accent)" : "var(--text-muted)",
              borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Synced Fields", value: syncResult?.total_synced ?? "—", color: "#3b82f6" },
              { label: "Mismatches Aktif",    value: syncResult?.total_mismatches ?? "—", color: "#f59e0b" },
              { label: "PTL Diproses",        value: syncResult?.ptl_count ?? "—", color: "#10b981" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border p-5"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {syncResult?.results && (
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
              <div className="px-5 py-3 border-b text-sm font-semibold"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                Detail Per PTL
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {syncResult.results.map((r: SyncResult, i: number) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: r.ok ? "#10b981" : "#ef4444" }} />
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {r.ptl_username ?? "unknown"}
                      </span>
                    </div>
                    {r.ok ? (
                      <div className="flex gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <span>Synced: <b>{r.synced_fields}</b></span>
                        <span>Mismatch: <b>{r.new_mismatches}</b></span>
                        <span>Missing in PTL: <b>{r.missing_in_ptl?.length ?? 0}</b></span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: "#f87171" }}>{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!syncResult && (
            <div className="rounded-2xl border p-10 text-center"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)", borderStyle: "dashed" }}>
              <svg className="w-10 h-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Belum ada hasil sync
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Klik tombol "Sync Semua PTL" untuk mulai
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Sync Logs */}
      {tab === "logs" && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          {loadingLogs ? (
            <div className="p-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>Memuat logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>Belum ada sync log.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="th-table-head">
                  <tr>
                    {["ID PA", "Field", "Nilai Lama", "Nilai Baru", "Tipe", "Waktu", "Oleh"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold"
                        style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id}
                      style={{ background: i % 2 !== 0 ? "var(--table-row-alt)" : "var(--bg-surface)" }}>
                      <td className="px-4 py-2.5 font-mono" style={{ color: "var(--text-primary)" }}>{log.id_pa}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-secondary)" }}>{log.field_changed}</td>
                      <td className="px-4 py-2.5 max-w-[150px] truncate" style={{ color: "#f87171" }} title={log.old_value ?? ""}>
                        {log.old_value || "—"}
                      </td>
                      <td className="px-4 py-2.5 max-w-[150px] truncate" style={{ color: "#10b981" }} title={log.new_value ?? ""}>
                        {log.new_value || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                          {log.sync_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>
                        {new Date(log.synced_at).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-secondary)" }}>{log.synced_by ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Mismatches */}
      {tab === "mismatches" && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          {loadingMismatches ? (
            <div className="p-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>Memuat mismatches...</div>
          ) : mismatches.length === 0 ? (
            <div className="p-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              Tidak ada mismatch aktif. ✓
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="th-table-head">
                  <tr>
                    {["ID PA", "Tipe Mismatch", "Terdeteksi", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold"
                        style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mismatches.map((m, i) => (
                    <tr key={m.id}
                      style={{ background: i % 2 !== 0 ? "var(--table-row-alt)" : "var(--bg-surface)" }}>
                      <td className="px-4 py-2.5 font-mono" style={{ color: "var(--text-primary)" }}>{m.id_pa}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            background: m.mismatch_type === "missing_in_engineer"
                              ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                            color: m.mismatch_type === "missing_in_engineer" ? "#ef4444" : "#f59e0b",
                          }}>
                          {m.mismatch_type === "missing_in_engineer" ? "Tidak ada di Engineer" : "Tidak ada di PTL"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>
                        {new Date(m.detected_at).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleDismiss(m.id)}
                          className="px-3 py-1 rounded-lg text-[11px] font-medium transition"
                          style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                        >
                          Dismiss
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
