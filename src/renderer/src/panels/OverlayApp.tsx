import { useEffect, useMemo, useState } from "react";
import { X, GripHorizontal, Radio } from "lucide-react";
import { useI18n } from "../i18n";
import { useStore } from "../state/store";
import type { GsiState, SpectateConfig } from "../../../shared/types";

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function weaponShort(name: string): string {
  return name.replace("weapon_", "").slice(0, 10);
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

  const { playersCt, playersT } = useMemo(() => {
    const all = state?.allplayers ? Object.values(state.allplayers) : [];
    const rows = all
      .filter((p) => p && p.name)
      .sort((a, b) => (b.match_stats?.kills ?? 0) - (a.match_stats?.kills ?? 0));
    return {
      playersCt: rows.filter((p) => p.team === "CT"),
      playersT: rows.filter((p) => p.team === "T"),
    };
  }, [state?.allplayers]);

  const mapName = state?.map?.name ? state.map.name.replace(/^de_/, "") : state?.provider?.map ?? "—";
  const ctScore = state?.round?.team_ct?.score ?? state?.map?.team_ct?.score ?? 0;
  const tScore = state?.round?.team_t?.score ?? state?.map?.team_t?.score ?? 0;
  const roundNum = state?.round?.round_number ?? state?.map?.round ?? 0;
  const phaseKey = state?.phase_countdowns?.phase ?? state?.round?.phase;
  const phaseEnds = parseFloat(state?.phase_countdowns?.phase_ends_in ?? "0");
  const aliveCt = playersCt.filter((p) => p.state?.health > 0).length;
  const aliveT = playersT.filter((p) => p.state?.health > 0).length;
  const showTimer = cfg?.showTimer !== false && (phaseKey === "live" || phaseKey === "bomb" || phaseKey === "defuse");
  const bombState = state?.round?.bomb;

  if (!cfg) return null;
  const scale = cfg.fontScale ?? 1;

  const PlayerRow = ({ p }: { p: NonNullable<GsiState["allplayers"]>[string] }) => {
    const alive = (p.state?.health ?? 0) > 0;
    const primary = Object.values(p.weapons ?? {}).find(
      (w) => w?.type === "Rifle" || w?.type === "SniperRifle" || w?.type === "Machine Gun"
    );
    return (
      <div className={`hud-player ${alive ? "" : "hud-player--dead"}`}>
        <div className={`hud-player__team hud-player__team--${p.team?.toLowerCase()}`} />
        <div className="hud-player__body">
          <div className="hud-player__top">
            <span className="hud-player__name">{p.name}</span>
            <span className="hud-player__rk">{p.state?.round_kills ?? 0}</span>
          </div>
          <div className="hud-player__bottom">
            <span className="hud-player__k">
              {p.match_stats?.kills ?? 0}
              <i>/</i>
              {p.match_stats?.deaths ?? 0}
            </span>
            <span className="hud-player__money">{p.state?.money ?? 0}</span>
            <span className="hud-player__gun">{primary ? weaponShort(primary.name) : "—"}</span>
            <div className="hud-player__hp">
              <div
                className="hud-player__hpbar"
                style={{ width: `${Math.max(0, Math.min(100, p.state?.health ?? 0))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="overlay" style={{ fontSize: `${14 * scale}px` }}>
      {!cfg.clickThrough && (
        <div className="overlay__chrome">
          <GripHorizontal size={12} />
          <button className="overlay__close" onClick={() => window.controller.overlayClose()}>
            <X size={11} />
          </button>
        </div>
      )}

      <div className="hud-panel">
        {cfg.showScore !== false && (
          <div className="hud-matchbar">
            <div className="hud-team hud-team--ct">
              <span className="hud-team__alive">{aliveCt}</span>
              <span className="hud-team__score">{ctScore}</span>
              <div className="hud-team__bar">
                <div className="hud-team__barfill" style={{ width: `${(aliveCt / Math.max(1, playersCt.length)) * 100}%` }} />
              </div>
            </div>
            <div className="hud-timer">
              {showTimer && <div className="hud-timer__text">{fmtTime(phaseEnds)}</div>}
              <div className="hud-timer__round">
                {roundNum > 0 ? `R${roundNum}` : mapName}
              </div>
              <div className="hud-timer__phase">
                <span className={`hud-phase ${phaseKey === "bomb" ? "hud-phase--bomb" : ""}`}>
                  {t(PHASE_KEYS[phaseKey ?? ""] ?? "spectate.phaseLive")}
                </span>
                {bombState && (
                  <span className="hud-bomb">
                    <Radio size={9} /> {t(`spectate.bomb${bombState.charAt(0).toUpperCase()}${bombState.slice(1)}` as never) ?? bombState}
                  </span>
                )}
              </div>
            </div>
            <div className="hud-team hud-team--t">
              <div className="hud-team__bar">
                <div className="hud-team__barfill" style={{ width: `${(aliveT / Math.max(1, playersT.length)) * 100}%` }} />
              </div>
              <span className="hud-team__score">{tScore}</span>
              <span className="hud-team__alive">{aliveT}</span>
            </div>
          </div>
        )}

        {cfg.showPlayers !== false && (playersCt.length > 0 || playersT.length > 0) && (
          <div className="hud-teams">
            <div className="hud-teamcol hud-teamcol--ct">
              {playersCt.map((p, i) => (
                <PlayerRow key={i} p={p} />
              ))}
            </div>
            <div className="hud-teamcol hud-teamcol--t">
              {playersT.map((p, i) => (
                <PlayerRow key={i} p={p} />
              ))}
            </div>
          </div>
        )}

        {!state && (
          <div className="hud-waiting">
            <span className="hud-waiting__dot" />
            {t("spectate.waiting")}
          </div>
        )}

        <div className={`hud-director ${cfg.autoDirector ? "" : "hud-director--off"}`}>
          {t("spectate.autoDirector")} {cfg.autoDirector ? "ON" : "OFF"}
        </div>
      </div>
    </div>
  );
}
