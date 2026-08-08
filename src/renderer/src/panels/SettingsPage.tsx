import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  FolderOpen,
  Languages,
  Palette,
  UserRound,
  Crosshair,
  Bomb,
  ForkKnife,
  Github,
  ShieldCheck,
  Info,
  Trash2,
  RefreshCw,
  Download,
} from "lucide-react";
import { useI18n, type Lang } from "../i18n";
import { useStore } from "../state/store";

const KNIFE_SUBCLASSES: Record<number, string> = {
  500: "Bayonet",
  503: "Classic",
  505: "Flip",
  506: "Gut",
  507: "Karambit",
  508: "M9 Bayonet",
  509: "Huntsman",
  512: "Falchion",
  514: "Bowie",
  515: "Butterfly",
  516: "Push",
  517: "Cord",
  518: "Canis",
  519: "Ursus",
  520: "Jackknife",
  521: "Outdoor",
  522: "Stiletto",
  523: "Widowmaker",
  525: "Skeleton",
  526: "Kukri",
};

const AIM_VALUES = [
  { key: "head", label: "aimHead" },
  { key: "mixed", label: "aimMixed" },
  { key: "body", label: "aimBody" },
] as const;

const NADES_VALUES = [
  { key: "max", label: "nadesMax" },
  { key: "more", label: "nadesMore" },
  { key: "normal", label: "nadesNormal" },
  { key: "less", label: "nadesLess" },
  { key: "off", label: "nadesOff" },
] as const;

export default function SettingsPage({ onBack }: { onBack: () => void }) {
  const { t, lang, setLang } = useI18n();
  const store = useStore();
  const { config, botItems, presets, dropKnives, cs2Running, updateInfo, controllerUpdate } = store;
  const [capturing, setCapturing] = useState(false);
  const keyInputRef = useRef<HTMLButtonElement>(null);
  const [controllerVersion, setControllerVersion] = useState("1.0.0");

  useEffect(() => {
    window.controller.version().then((v) => setControllerVersion(v.controller));
  }, []);

  useEffect(() => {
    if (!config?.language) return;
    const l: Lang = config.language === "en" ? "en" : "zh-CN";
    if (l !== lang) setLang(l);
  }, [config?.language, lang, setLang]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!capturing) return;
      e.preventDefault();
      e.stopPropagation();
      const key = e.key;
      if (key === "Escape") {
        setCapturing(false);
        return;
      }
      const mapped = key === "\\" || key === "Escape" ? "\\" : key;
      if (mapped.length <= 2 && mapped !== "Control" && mapped !== "Shift" && mapped !== "Alt") {
        const sel = dropKnives?.selected ?? config?.dropKnifeSubclasses ?? [];
        store.setKnives(mapped, sel);
        setCapturing(false);
      }
    },
    [capturing, dropKnives?.selected, config?.dropKnifeSubclasses, store]
  );

  useEffect(() => {
    if (capturing) {
      window.addEventListener("keydown", onKeyDown, true);
      return () => window.removeEventListener("keydown", onKeyDown, true);
    }
  }, [capturing, onKeyDown]);

  const toggleKnife = (id: number) => {
    const base = dropKnives?.selected ?? config?.dropKnifeSubclasses ?? [];
    const sel = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    store.setKnives(dropKnives?.bindKey ?? config?.dropKnifeBind ?? "\\", sel);
  };

  const installed = !!store.files?.ok;

  return (
    <div className="page">
      <div className="card__head" style={{ marginBottom: 14 }}>
        <button className="btn btn--ghost btn--sm" onClick={onBack}>
          <ChevronLeft size={14} />
          {t("titlebar.back")}
        </button>
        <div className="card__title" style={{ marginRight: "auto", marginLeft: 4 }}>
          <div className="card__icon">
            <Info size={14} />
          </div>
          {t("settings.title")}
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <div className="card__title" style={{ marginBottom: 8 }}>
            <div className="card__icon">
              <FolderOpen size={14} />
            </div>
            {t("settings.directory")}
          </div>
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="hint" style={{ flex: 1, wordBreak: "break-all" }}>
              {store.directory?.selected ?? t("home.noDir")}
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => store.pickDirectory()}>
              <FolderOpen size={13} />
              {t("home.change")}
            </button>
          </div>
          <div className="hint">{t("settings.directoryDesc")}</div>
        </div>

        <div className="card">
          <div className="card__title" style={{ marginBottom: 8 }}>
            <div className="card__icon">
              <Languages size={14} />
            </div>
            {t("settings.language")}
          </div>
          <div className="segmented" style={{ maxWidth: 260 }}>
            <button
              className={`segmented__item ${lang === "zh-CN" ? "segmented__item--active" : ""}`}
              onClick={() => {
                setLang("zh-CN");
                store.updateConfig({ language: "zh-CN" });
              }}
            >
              简体中文
            </button>
            <button
              className={`segmented__item ${lang === "en" ? "segmented__item--active" : ""}`}
              onClick={() => {
                setLang("en");
                store.updateConfig({ language: "en" });
              }}
            >
              English
            </button>
          </div>
        </div>

        {installed && (
          <>
            <div className="card">
              <div className="card__title" style={{ marginBottom: 4 }}>
                <div className="card__icon">
                  <Palette size={14} />
                </div>
                {t("botItems.title")}
              </div>
              <div className="setting-row">
                <div className="setting-row__info">
                  <div className="setting-row__title">{t("botItems.skins")}</div>
                  <div className="setting-row__desc">{t("botItems.skinsDesc")}</div>
                </div>
                <button
                  className={`toggle ${botItems?.skins ? "toggle--on" : ""}`}
                  onClick={() => store.setBotItem("skins", !botItems?.skins)}
                />
              </div>
              <div className="setting-row">
                <div className="setting-row__info">
                  <div className="setting-row__title">{t("botItems.profiles")}</div>
                  <div className="setting-row__desc">{t("botItems.profilesDesc")}</div>
                </div>
                <button
                  className={`toggle ${botItems?.profiles ? "toggle--on" : ""}`}
                  onClick={() => store.setBotItem("profiles", !botItems?.profiles)}
                />
              </div>
              {cs2Running && (
                <div className="hint" style={{ color: "var(--yellow)" }}>
                  {t("mode.pendingRestart")}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card__title" style={{ marginBottom: 10 }}>
                <div className="card__icon">
                  <Crosshair size={14} />
                </div>
                {t("presets.aim")}
              </div>
              <div className="segmented">
                {AIM_VALUES.map((v) => (
                  <button
                    key={v.key}
                    className={`segmented__item ${presets?.aim === v.key ? "segmented__item--active" : ""}`}
                    onClick={() => store.setAim(v.key)}
                  >
                    {t(`presets.${v.label}`)}
                  </button>
                ))}
              </div>
              <div className="card__title" style={{ margin: "18px 0 10px" }}>
                <div className="card__icon">
                  <Bomb size={14} />
                </div>
                {t("presets.nades")}
              </div>
              <div className="segmented">
                {NADES_VALUES.map((v) => (
                  <button
                    key={v.key}
                    className={`segmented__item ${presets?.nades === v.key ? "segmented__item--active" : ""}`}
                    onClick={() => store.setNades(v.key)}
                  >
                    {t(`presets.${v.label}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card__title" style={{ marginBottom: 4 }}>
                <div className="card__icon">
                  <ForkKnife size={14} />
                </div>
                {t("knives.title")}
              </div>
              <div className="hint" style={{ margin: "4px 0 12px" }}>
                {t("knives.desc")}
              </div>
              <div className="row">
                <span className="hint">{t("knives.bind")}</span>
                <button
                  ref={keyInputRef}
                  className={`key-input ${capturing ? "key-input--capture" : ""}`}
                  onClick={() => setCapturing((c) => !c)}
                >
                  {capturing ? "…" : (dropKnives?.bindKey ?? config?.dropKnifeBind ?? "\\")}
                </button>
              </div>
              <div className="knife-grid">
                {Object.entries(KNIFE_SUBCLASSES).map(([id, name]) => {
                  const n = Number(id);
                  const on = (dropKnives?.selected ?? config?.dropKnifeSubclasses ?? []).includes(n);
                  return (
                    <button key={id} className={`chip ${on ? "chip--on" : ""}`} onClick={() => toggleKnife(n)}>
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="card">
          <div className="card__title" style={{ marginBottom: 4 }}>
            <div className="card__icon">
              <RefreshCw size={14} />
            </div>
            {t("update.title")}
          </div>
          <div className="hint" style={{ margin: "4px 0 12px" }}>
            {t("update.desc")}
          </div>
          {(
            [
              { label: t("update.plugin"), info: updateInfo },
              { label: t("update.controller"), info: controllerUpdate },
            ] as const
          ).map(({ label, info }) => (
            <div className="row" key={label} style={{ marginBottom: 8 }}>
              <span className="pill">{label}</span>
              <span className="pill" style={{ marginLeft: "auto" }}>
                {t("update.current")} v{info?.current ?? "—"}
              </span>
              <span className={`pill ${info?.hasUpdate ? "pill--accent" : ""}`}>
                {t("update.latest")}{" "}
                {store.updateChecking ? "…" : info?.latest ? `v${info.latest}` : "—"}
              </span>
              {store.updateChecking ? (
                <span className="hint">{t("update.checking")}</span>
              ) : info?.error ? (
                <span className="hint" style={{ color: "var(--red)" }}>
                  {t("update.failed")}
                </span>
              ) : info?.hasUpdate ? (
                <span className="hint" style={{ color: "var(--accent-strong)" }}>
                  {t("update.found")}
                </span>
              ) : (
                <span className="hint" style={{ color: "var(--green)" }}>
                  ✓
                </span>
              )}
            </div>
          ))}
          <div className="row" style={{ marginTop: 4 }}>
            <button
              className="btn btn--ghost btn--sm"
              disabled={store.updateChecking}
              onClick={() => store.checkUpdate(true)}
            >
              <RefreshCw size={13} />
              {t("update.check")}
            </button>
            {updateInfo?.hasUpdate && updateInfo.url && (
              <button
                className="btn btn--primary btn--sm"
                onClick={() => window.controller.openExternal(updateInfo.url!)}
              >
                <Download size={13} />
                {t("update.plugin")} v{updateInfo.latest}
              </button>
            )}
            {controllerUpdate?.hasUpdate && controllerUpdate.url && (
              <button
                className="btn btn--primary btn--sm"
                onClick={() => window.controller.openExternal(controllerUpdate.url!)}
              >
                <Download size={13} />
                {t("update.controller")} v{controllerUpdate.latest}
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card__title" style={{ marginBottom: 4, color: "var(--red)" }}>
            <div className="card__icon" style={{ color: "var(--red)", borderColor: "rgba(240,82,94,.4)" }}>
              <Trash2 size={14} />
            </div>
            {t("uninstall.title")}
          </div>
          <div className="hint" style={{ margin: "4px 0 12px" }}>
            {t("uninstall.desc")}
          </div>
          <button
            className="btn btn--ghost btn--sm"
            style={{ borderColor: "rgba(240,82,94,.45)", color: "var(--red)" }}
            disabled={!installed || cs2Running}
            onClick={async () => {
              if (!window.confirm(t("uninstall.confirm"))) return;
              const result = await store.uninstall();
              if (result?.ok) {
                store.showToast(`✓ ${t("uninstall.done")} (${result.removed})`);
              }
            }}
          >
            <Trash2 size={13} />
            {t("uninstall.button")}
          </button>
        </div>

        <div className="card">
          <div className="card__title" style={{ marginBottom: 4 }}>
            <div className="card__icon">
              <ShieldCheck size={14} />
            </div>
            {t("settings.about")}
          </div>
          <div className="hint" style={{ margin: "4px 0 12px" }}>
            {t("settings.aboutDesc")}
          </div>
          <div className="row">
            <button
              className="btn btn--ghost btn--sm"
              onClick={() =>
                window.controller.openExternal("https://github.com/ed0ard/CS2-Bot-Improver")
              }
            >
              <Github size={13} />
              {t("settings.openSource")}
            </button>
            <span className="pill pill--accent" style={{ marginLeft: "auto" }}>
              <UserRound size={11} /> CBIC v{controllerVersion}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
