import { useCallback, useState } from "react";
import {
  Package,
  Download,
  Check,
  RefreshCw,
  Bot,
  Globe2,
  Rocket,
  Gauge,
  ChevronRight,
  FolderOpen,
  AlertTriangle,
  Gamepad2,
  Terminal,
} from "lucide-react";
import { useI18n } from "../i18n";
import { useStore } from "../state/store";

const DIFF_LEVELS = [
  { key: "Low", icon: "low" },
  { key: "Medium", icon: "medium" },
  { key: "High", icon: "high" },
] as const;

export default function HomePage({
  onOpenCommands,
  onOpenSettings,
}: {
  onOpenCommands: () => void;
  onOpenSettings: () => void;
}) {
  const { t } = useI18n();
  const store = useStore();
  const {
    files,
    directory,
    cs2Running,
    mode,
    difficulty,
    installing,
    installProgress,
    config,
    updateInfo,
    controllerUpdate,
  } = store;
  const [launching, setLaunching] = useState(false);

  const installed = !!files?.ok;

  const doInstall = useCallback(async () => {
    if (cs2Running) {
      store.reportError(t("install.warning"));
      return;
    }
    store.setInstalling(true);
    store.setInstallProgress({ phase: "prepare", current: 0, total: 1, file: "" });
    const unsub = window.controller.onInstallProgress((ev) =>
      store.setInstallProgress(ev)
    );
    try {
      const result = await window.controller.installPackage();
      if (!result.ok) {
        store.reportError(result.message ?? "install failed");
      } else {
        store.showToast("✓ 安装完成");
      }
    } catch (e) {
      store.reportError(e instanceof Error ? e.message : String(e));
    } finally {
      unsub();
      store.setInstalling(false);
      store.setInstallProgress(null);
      await store.refresh();
    }
  }, [store, cs2Running, t]);

  const doLaunch = useCallback(async () => {
    if (!installed) return;
    setLaunching(true);
    try {
      const result = await store.launch();
      if (result.launched) {
        store.showToast(`✓ ${t("mode.launching")}`);
      } else if (result.error === "cs2 already running") {
        store.showToast(t("mode.running"));
      } else {
        store.reportError(result.error ?? "launch failed");
      }
    } catch {
      store.reportError("launch failed");
    } finally {
      setLaunching(false);
    }
  }, [installed, store, t]);

  const headerStatus =
    !installed
      ? "red"
      : (files && files.driftMissing > 0) || mode?.pending || mode?.cs2Running
        ? "yellow"
        : "green";

  const statusText = !installed
    ? t("home.statusNotInstalled")
    : files && files.driftMissing > 0
      ? t("home.statusMissing")
      : mode?.pending
        ? t("home.statusRestart")
        : t("home.statusOk");

  return (
    <div className="page">
      <div className="statusbar">
        <div className="statusbar__item">
          <span className={`dot dot--${headerStatus} dot--pulse`} style={{ color: `var(--${headerStatus})` }} />
          <span>{statusText}</span>
        </div>
        <div className="statusbar__item">
          <span className={`dot ${cs2Running ? "dot--green dot--pulse" : "dot--yellow"}`} style={{ color: cs2Running ? "var(--green)" : "var(--yellow)" }} />
          <span>{cs2Running ? t("home.cs2Running") : t("home.cs2NotRunning")}</span>
        </div>
        <div className="statusbar__path">
          <FolderOpen size={12} />
          <span className="statusbar__path-text">
            {directory?.selected ?? t("home.noDir")}
          </span>
          <button className="link-btn" onClick={() => store.pickDirectory()}>
            {t("home.change")}
          </button>
        </div>
      </div>

      {(updateInfo?.hasUpdate || controllerUpdate?.hasUpdate) && (
        <div className="update-banner fade-in" style={{ marginBottom: 14 }}>
          <div className="update-banner__icon">
            <Download size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {controllerUpdate?.hasUpdate
                ? `${t("update.bannerController")} v${controllerUpdate.latest}`
                : `${t("update.banner")} v${updateInfo?.latest}`}
            </div>
            <div className="hint" style={{ marginTop: 2 }}>
              {t("update.newVersion")}
            </div>
          </div>
          <button
            className="btn btn--primary btn--sm"
            style={{ flexShrink: 0 }}
            onClick={() => {
              const url = controllerUpdate?.hasUpdate
                ? controllerUpdate.url
                : updateInfo?.url;
              if (url) window.controller.openExternal(url);
            }}
          >
            <Download size={13} />
            {t("update.download")}
          </button>
        </div>
      )}

      <div className="install-hero">
        <div className="install-hero__icon">
          {installed ? <Check size={24} strokeWidth={2.6} /> : <Package size={24} strokeWidth={2.2} />}
        </div>
        <div className="install-hero__info" style={{ flex: 1, minWidth: 0 }}>
          <div className="install-hero__title">
            {installed ? `✓ ${t("install.ok")} v1.4.3` : t("install.title")}
          </div>
          <div className="install-hero__desc">
            {installed ? t("install.doneDesc") : t("install.desc")}
          </div>
        </div>
        <div className="install-hero__action">
          {installed ? (
            <button
              className="btn btn--ghost btn--sm"
              onClick={doInstall}
              disabled={installing || cs2Running}
              title={cs2Running ? t("install.warning") : undefined}
            >
              <RefreshCw size={13} />
              {t("install.reinstall")}
            </button>
          ) : (
            <button
              className="btn btn--primary"
              onClick={doInstall}
              disabled={installing || cs2Running || !directory?.selected}
              title={cs2Running ? t("install.warning") : undefined}
            >
              {installing ? (
                <>
                  <RefreshCw size={15} className="dot--pulse" style={{ color: "var(--accent)" }} />
                  {t("install.installing")}
                </>
              ) : (
                <>
                  <Download size={15} />
                  {t("install.button")}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {installing && installProgress && (
        <div className="card fade-in" style={{ marginBottom: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <div className="row">
              <RefreshCw size={14} className="dot--pulse" style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                {installProgress.phase === "prepare"
                  ? t("install.phasePrepare")
                  : installProgress.phase === "finalize"
                    ? t("install.phaseFinalize")
                    : installProgress.phase === "done"
                      ? t("install.phaseDone")
                      : t("install.phaseExtract")}
              </span>
            </div>
            <span className="hint">
              {installProgress.current}/{installProgress.total} {t("install.files")}
            </span>
          </div>
          <div className="progress">
            <div
              className="progress__bar"
              style={{
                width: `${
                  installProgress.total
                    ? Math.min(100, (installProgress.current / installProgress.total) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          {installProgress.file && (
            <div className="hint" style={{ marginTop: 8, wordBreak: "break-all" }}>
              {installProgress.file}
            </div>
          )}
        </div>
      )}

      {!directory?.valid && (
        <div className="card fade-in" style={{ marginBottom: 14, borderColor: "var(--yellow)" }}>
          <div className="row">
            <AlertTriangle size={16} style={{ color: "var(--yellow)" }} />
            <span style={{ fontSize: 12.5 }}>{t("home.noDir")}</span>
            <button className="btn btn--ghost btn--sm" style={{ marginLeft: "auto" }} onClick={() => store.pickDirectory()}>
              <FolderOpen size={13} />
              {t("home.selectDir")}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid--2">
        <div className="card">
          <div className="card__head">
            <div className="card__title">
              <div className="card__icon">
                <Bot size={15} />
              </div>
              {t("mode.title")}
            </div>
            <span className={`dot ${mode?.cs2Running ? "dot--green dot--pulse" : "dot--yellow"}`} style={{ color: mode?.cs2Running ? "var(--green)" : "var(--yellow)" }} />
          </div>
          <div className="segmented" style={{ marginBottom: 12 }}>
            <button
              className={`segmented__item ${mode?.current === "bots" ? "segmented__item--active" : ""}`}
              onClick={() => installed && store.setMode("bots")}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Bot size={13} /> {t("mode.bots")}
              </span>
              <small>{t("mode.botsDesc")}</small>
            </button>
            <button
              className={`segmented__item ${mode?.current === "online" ? "segmented__item--active" : ""}`}
              onClick={() => installed && store.setMode("online")}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Globe2 size={13} /> {t("mode.online")}
              </span>
              <small>{t("mode.onlineDesc")}</small>
            </button>
          </div>
          {mode?.pending && (
            <div className="hint" style={{ color: "var(--yellow)", marginBottom: 10 }}>
              {t("mode.pendingRestart")}
            </div>
          )}
          {installed && mode?.insecure && (
            <div className="hint" style={{ marginBottom: 10 }}>
              <span className="pill pill--accent">
                <Terminal size={11} /> -insecure 已启用
              </span>
            </div>
          )}
          <button
            className="btn btn--primary"
            style={{ width: "100%" }}
            disabled={!installed || launching || cs2Running}
            onClick={doLaunch}
          >
            <Rocket size={15} />
            {cs2Running ? t("mode.running") : t("mode.launch")}
          </button>
          {!installed && (
            <div className="hint" style={{ marginTop: 8 }}>
              {t("mode.needInstall")}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card__head">
            <div className="card__title">
              <div className="card__icon">
                <Gauge size={15} />
              </div>
              {t("difficulty.title")}
            </div>
            {config?.difficulty && (
              <span className="pill pill--accent">{config.difficulty}</span>
            )}
          </div>
          <div className="segmented">
            {DIFF_LEVELS.map(({ key }) => (
              <button
                key={key}
                className={`segmented__item ${difficulty?.current === key ? "segmented__item--active" : ""}`}
                onClick={() => installed && store.setDifficulty(key)}
              >
                {t(`difficulty.${key === "Low" ? "low" : key === "Medium" ? "medium" : "high"}`)}
                <small>
                  {t(`difficulty.${key === "Low" ? "lowDesc" : key === "Medium" ? "mediumDesc" : "highDesc"}`)}
                </small>
              </button>
            ))}
          </div>
          <div className="hint" style={{ marginTop: 10 }}>
            overrides/botprofile.vpk · {difficulty?.activePresent ? "✓" : "✗"}
          </div>
        </div>
      </div>

      <div className="grid grid--2 mt-14">
        <button className="card card--click" onClick={onOpenCommands}>
          <div className="row">
            <div className="card__icon">
              <Gamepad2 size={15} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 650, fontSize: 13 }}>{t("commands.title")}</div>
              <div className="hint" style={{ marginTop: 2 }}>
                {t("app.tagline")}
              </div>
            </div>
            <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
          </div>
        </button>
        <button className="card card--click" onClick={onOpenSettings}>
          <div className="row">
            <div className="card__icon">
              <Gauge size={15} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 650, fontSize: 13 }}>{t("settings.title")}</div>
              <div className="hint" style={{ marginTop: 2 }}>
                {t("settings.aboutDesc")}
              </div>
            </div>
            <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
          </div>
        </button>
      </div>

      <div className="footer-note">CBIC · CS2-Bot-Improver v1.4.3 · AGPL-3.0</div>
    </div>
  );
}
