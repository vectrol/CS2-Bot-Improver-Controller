import { useEffect, useMemo, useState } from "react";
import { Crosshair, Radio, Users } from "lucide-react";
import { useI18n } from "../i18n";
import { useStore } from "../state/store";
import type { GsiState, SpectateConfig } from "../../../shared/types";

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function weaponName(name: string): string {
  const short = name.replace("weapon_", "");
  return short.length > 12 ? short.slice(0, 12) : short;
}

const PHASE_KEYS: Record<string, string> = {
  freezetime: "spectate.phaseFreeze",
  live: "spectate.phaseLive",
  bomb: "spectate.phaseBomb",
  defuse: "spectate.phaseDefuse",
  over: "spectate.phaseOver",
  timeout_ct: "spectate.phasePause",
  timeout_t: "spectate.phasePause",
  paused: "spectate.phasePause",
};

export default function OverlayApp() {
  const { t } = useI18n();
  const store = useStore();
  const [cfg, setCfg] = useState<SpectateConfig | null>(null);
  const state = store.gsiState as GsiState | null;

  useEffect(() => {
    window.controller.configGet().then((c) => setCfg(c.spectate));
    const unsub = window.controller.onOverlayCfg(setCfg);
    return unsub;
  }, []);

  const players = useMemo(() => {
    if (!state?.allplayers) return [];
    return Object.values(state.allplayers)
      .filter((p) => p && p.name)
      .sort((a, b) => (b.match_stats?.kills ?? 0) - (a.match_stats?.kills ?? 0));
  }, [state?.allplayers]);

  const mapName = state?.map?.name ? state.map.name.replace(/^de_/, "") : state?.provider?.map ?? "—";
  const ctScore = state?.round?.team_ct?.score ?? state?.map?.team_ct?.score ?? 0;
  const tScore = state?.round?.team_t?.score ?? state?.map?.team_t?.score ?? 0;
  const phaseKey = state?.phase_countdowns?.phase ?? state?.round?.phase;
  const phaseEnds = parseFloat(state?.phase_countdowns?.phase_ends_in ?? "0");
  const aliveCt = players.filter((p) => p.team === "CT" && p.state?.health > 0).length;
  const aliveT = players.filter((p) => p.team === "T" && p.state?.health > 0).length;
  const showTimer = cfg?.showTimer !== false && (phaseKey === "live" || phaseKey === "bomb" || phaseKey === "defuse");
  const bombState = state?.round?.bomb;

  if (!cfg) return null;
  const fontScale = cfg.fontScale ?? 1;

  return (
    <div
      className="overlay"
      style={{
        opacity: cfg.opacity ?? 0.92,
        fontSize: `${14 * fontScale}px`,
      }}
    >
      <div className="overlay__panel">
        {cfg.showScore !== false && (
          <div className="overlay__score">
            <span className="overlay__team overlay__team--ct">
              {aliveCt !== undefined && <span className="overlay__alive">{aliveCt}▲</span>}
              <b>{ctScore}</b>
            </span>
            <span className="overlay__map">
              {mapName}
              <Radio size={11} style={{ verticalAlign: -1 }} />
            </span>
            <span className="overlay__team overlay__team--t">
              <b>{tScore}</b>
              <span className="overlay__alive">{aliveT}▲</span>
            </span>
          </div>
        )}
        {showTimer && (
          <div className="overlay__round">
            <span className={`overlay__phase ${phaseKey === "bomb" ? "overlay__phase--bomb" : ""}`}>
              {t(PHASE_KEYS[phaseKey ?? ""] ?? "spectate.phaseLive")}
            </span>
            <span className="overlay__time">{fmtTime(phaseEnds)}</span>
            {bombState && <span className="overlay__bomb">💣 {t(`spectate.bomb${bombState.charAt(0).toUpperCase()}${bombState.slice(1)}` as never) ?? bombState}</span>}
          </div>
        )}
        {cfg.showPlayers !== false && (
          <div className="overlay__players">
            {players.map((p, i) => {
              const primary = Object.values(p.weapons ?? {}).find(
                (w) => w?.type === "Rifle" || w?.type === "SniperRifle" || w?.type === "Submachine Gun" || w?.type === "Machine Gun" || w?.type === "Pistol"
              );
              return (
                <div key={i} className={`overlay__player ${p.state?.health > 0 ? "" : "overlay__player--dead"}`}>
                  <span className={`overlay__player-team overlay__player-team--${p.team?.toLowerCase()}`} />
                  <span className="overlay__player-name">{p.name}</span>
                  <span className="overlay__player-k">{p.match_stats?.kills ?? 0}</span>
                  <span className="overlay__player-d">{p.match_stats?.deaths ?? 0}</span>
                  <span className="overlay__player-money">{p.state?.money ?? 0}</span>
                  <span className="overlay__player-gun">{primary ? weaponName(primary.name) : "—"}</span>
                </div>
              );
            })}
          </div>
        )}
        {(!state || players.length === 0) && (
          <div className="overlay__empty">
            <Crosshair size={14} className="dot--pulse" style={{ color: "var(--accent)" }} />
            {t("spectate.waiting")}
          </div>
        )}
        <div className="overlay__auto">
          <Users size={10} />
          {t("spectate.autoDirector")}
        </div>
      </div>
    </div>
  );
}
