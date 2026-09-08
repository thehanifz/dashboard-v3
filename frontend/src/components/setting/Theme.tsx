import { useThemeStore } from "../../state/themeStore";

const SunIcon = () => <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>;
const MoonIcon = () => <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;

export default function Theme() {
  const { theme, toggleTheme } = useThemeStore();
  const dark = theme === "dark";

  return (
    <section className="rounded-3xl border p-4 sm:p-5" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          {dark ? <MoonIcon /> : <SunIcon />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Tampilan</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Pilih mode terang atau gelap untuk dashboard.</p>
        </div>
        <button type="button" onClick={toggleTheme} className="shrink-0 inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all" style={{ background: "var(--bg-surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          {dark ? <SunIcon /> : <MoonIcon />}
          <span>{dark ? "Light" : "Dark"}</span>
        </button>
      </div>
    </section>
  );
}
