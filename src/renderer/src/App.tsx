import { useEffect, useState } from "react";
import {
  Crosshair,
  Minus,
  Square,
  X,
  Terminal,
  Settings2,
} from "lucide-react";
import { useI18n } from "./i18n";
import { useStore } from "./state/store";
import HomePage from "./panels/HomePage";
import CommandsPage from "./panels/CommandsPage";
import SettingsPage from "./panels/SettingsPage";
import ErrorModal from "./components/ErrorModal";

type View = "home" | "commands" | "settings";

export default function App() {
  const { t, setLang } = useI18n();
  const { ready, toast, config, error, clearError } = useStore();
  const [view, setView] = useState<View>("home");
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (config?.language && (config.language === "zh-CN" || config.language === "en")) {
      setLang(config.language);
    }
  }, [config?.language, setLang]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && view !== "home") setView("home");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  return (
    <div className="shell">
      <div className="bg-glow" />
      <header className="titlebar">
        <div className="titlebar__brand">
          <div className="titlebar__logo">
            <Crosshair size={14} strokeWidth={2.4} />
          </div>
          <span className="brand-badge">CBIC</span>
          <div className="titlebar__title">{t("app.name")}</div>
          <div className="titlebar__sub">· {t("app.tagline")}</div>
        </div>
        <nav className="titlebar__nav">
          <button
            className="win-btn"
            title="Commands"
            onClick={() => setView("commands")}
          >
            <Terminal size={15} />
          </button>
          <button
            className="win-btn"
            title="Settings"
            onClick={() => setView(view === "settings" ? "home" : "settings")}
          >
            <Settings2 size={15} />
          </button>
          <div className="divider" style={{ height: 18, margin: "0 4px" }} />
          <button className="win-btn" onClick={() => window.controller.windowMinimize()}>
            <Minus size={14} />
          </button>
          <button
            className="win-btn"
            onClick={() => {
              window.controller.windowMaximize();
              setMaximized(!maximized);
            }}
          >
            {maximized ? <Square size={11} /> : <Square size={12} />}
          </button>
          <button className="win-btn win-btn--close" onClick={() => window.controller.windowClose()}>
            <X size={14} />
          </button>
        </nav>
      </header>

      <main className="shell__body">
        {!ready ? (
          <div className="page" style={{ alignItems: "center", justifyContent: "center" }}>
            <div className="pill pill--accent" style={{ fontSize: 13, padding: "10px 18px" }}>
              <Crosshair size={14} className="dot--pulse" style={{ color: "var(--accent)" }} />
              加载中…
            </div>
          </div>
        ) : view === "commands" ? (
          <CommandsPage onBack={() => setView("home")} />
        ) : view === "settings" ? (
          <SettingsPage onBack={() => setView("home")} />
        ) : (
          <HomePage
            onOpenCommands={() => setView("commands")}
            onOpenSettings={() => setView("settings")}
          />
        )}
      </main>

      <div className={`toast ${toast ? "toast--show" : ""}`}>
        {toast && <span style={{ color: "var(--accent)" }}>✓</span>}
        {toast}
      </div>

      <ErrorModal message={error} onClose={clearError} />
    </div>
  );
}
