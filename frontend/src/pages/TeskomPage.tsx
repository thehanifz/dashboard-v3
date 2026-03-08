import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import ToastContainer from "../components/ui/ToastContainer";
import TeskomForm from "../components/teskom/TeskomForm";
import { useToast } from "../utils/useToast";

export default function TeskomPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toasts, show: showToast }             = useToast();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>
      <Sidebar
        view="summary"
        onViewChange={() => {}}
        collapsed={sidebarCollapsed}
        onToast={showToast}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="topbar h-14 flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Test Commissioning</h1>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Generate dokumen BAI/BATC — auto-fill dari GSheet</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden p-4 pb-16 md:pb-4">
          <div className="h-full rounded-2xl p-5 overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <TeskomForm onToast={showToast} />
          </div>
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
