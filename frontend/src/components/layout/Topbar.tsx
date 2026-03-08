import { useState, useEffect, useRef, useCallback } from "react";
import { useTaskStore } from "../../state/taskStore";

interface TopbarProps {
  onRefresh: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

function timeAgo(date: Date | null): string {
  if (!date) return "Belum dimuat";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return "Baru saja";
  if (diff < 60) return `${diff} detik lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  return `${Math.floor(diff / 3600)} jam lalu`;
}

export default function Topbar({ onRefresh, sidebarCollapsed, onToggleSidebar }: TopbarProps) {
  const isLoading      = useTaskStore(s => s.isLoading);
  const lastUpdated    = useTaskStore(s => s.lastUpdated);
  const autoEnabled    = useTaskStore(s => s.autoRefreshEnabled);
  const autoInterval   = useTaskStore(s => s.autoRefreshInterval);
  const setAutoRefresh = useTaskStore(s => s.setAutoRefresh);
  const records        = useTaskStore(s => s.records);

  const [label, setLabel]         = useState("Belum dimuat");
  const [showAuto, setShowAuto]   = useState(false);
  const [nowStr, setNowStr]       = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setLabel(timeAgo(lastUpdated));
      setNowStr(new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    }, 10000);
    setLabel(timeAgo(lastUpdated));
    setNowStr(new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    return () => clearInterval(t);
  }, [lastUpdated]);

  useEffect(() => {
    if (!autoEnabled) return;
    const t = setInterval(onRefresh, autoInterval * 60 * 1000);
    return () => clearInterval(t);
  }, [autoEnabled, autoInterval, onRefresh]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowAuto(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <header className="topbar h-14 flex items-center justify-between px-4 shrink-0 z-30" style={{ flexShrink: 0 }}>
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="hidden sm:block">
          <h1 className="text-sm font-bold leading-tight" style={{ color: "var(--text-primary)" }}>Dashboard Progres PA</h1>
          <p className="text-[11px] leading-tight" style={{ color: "var(--text-muted)" }}>{nowStr}</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Total pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <svg className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>{records.length}</span>
          <span>PA</span>
        </div>

        {/* Last updated */}
        <div className="hidden md:flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {label}
        </div>

        {/* Auto refresh dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowAuto(v => !v)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors font-medium"
            style={autoEnabled
              ? { background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46" }
              : { background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
            }
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">{autoEnabled ? `Auto ${autoInterval}m` : "Auto"}</span>
          </button>

          {showAuto && (
            <div className="absolute top-full right-0 mt-1.5 w-48 rounded-xl shadow-xl p-3 z-50 th-modal">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Auto Refresh</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs" style={{ color: "var(--text-primary)" }}>Aktifkan</span>
                <button onClick={() => setAutoRefresh(!autoEnabled)}
                  className={`toggle-track ${autoEnabled ? "on" : ""}`}
                  style={{ background: autoEnabled ? "var(--accent)" : "var(--border-strong)" }}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>
              <p className="text-[11px] mb-1.5" style={{ color: "var(--text-muted)" }}>Interval</p>
              {[1, 3, 5, 10].map(m => (
                <button key={m} onClick={() => setAutoRefresh(autoEnabled, m)}
                  className="w-full text-left px-2 py-1 text-xs rounded mb-0.5 transition-colors"
                  style={autoInterval === m
                    ? { background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 600 }
                    : { color: "var(--text-secondary)" }
                  }
                >Setiap {m} menit</button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh button */}
        <button onClick={onRefresh} disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors shadow-sm"
          style={{ background: isLoading ? "var(--text-muted)" : "var(--accent)" }}
        >
          {isLoading
            ? <span className="spinner" />
            : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          }
          <span className="hidden sm:inline">{isLoading ? "Memuat..." : "Refresh"}</span>
        </button>
      </div>
    </header>
  );
}
