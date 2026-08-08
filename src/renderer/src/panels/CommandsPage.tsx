import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  Search,
  Copy,
  Check,
  Terminal,
  Star,
  X,
  LayoutGrid,
  Plus,
  Pencil,
  Trash2,
  Save,
} from "lucide-react";
import { useI18n, type Lang } from "../i18n";
import { useStore } from "../state/store";
import type { CommandBlock } from "../../../shared/types";
import { SECTION_META, sectionLabel, descFor } from "../data/commands";

const FAV_KEY = "cbic.favs";
const CUSTOM_KEY = "cbic.customBlocks";

export type CustomBlock = {
  id: string;
  title: string;
  commands: string[];
};

function loadFavs(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function loadCustom(): CustomBlock[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]");
    return Array.isArray(raw)
      ? raw.filter((x) => x && typeof x === "object" && Array.isArray(x.commands))
      : [];
  } catch {
    return [];
  }
}

function persistCustom(blocks: CustomBlock[]): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(blocks));
  } catch {
    /* ignore */
  }
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;
  const parts: ReactNode[] = [];
  let rest = text;
  let i = 0;
  const lower = text.toLowerCase();
  let from = 0;
  let idx = lower.indexOf(q);
  while (idx >= 0 && i < 8) {
    parts.push(rest.slice(from, idx));
    parts.push(<mark key={i}>{rest.slice(idx, idx + q.length)}</mark>);
    from = idx + q.length;
    idx = lower.indexOf(q, from);
    i++;
  }
  parts.push(rest.slice(from));
  return <>{parts}</>;
}

export default function CommandsPage({ onBack }: { onBack: () => void }) {
  const { t, lang } = useI18n();
  const store = useStore();
  const [blocks, setBlocks] = useState<CommandBlock[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [custom, setCustom] = useState<CustomBlock[]>(loadCustom);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.controller.commandsLoad().then(setBlocks).catch(() => setBlocks([]));
    searchRef.current?.focus();
  }, []);

  const sections = useMemo(
    () => [...new Set(blocks.map((b) => b.section))],
    [blocks]
  );

  const blockKey = (b: CommandBlock, i: number) =>
    `${b.section}:${b.title || b.commands[0] || i}`;

  const toggleFav = (key: string) => {
    setFavs((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const startEdit = (b: CustomBlock) => {
    setEditing(b.id);
    setEditTitle(b.title);
    setEditText(b.commands.join("\n"));
  };

  const saveEdit = () => {
    const title = editTitle.trim() || t("customBlocks.newTitle");
    const commands = editText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (commands.length === 0) return;
    setCustom((prev) => {
      const next = editing
        ? prev.map((b) => (b.id === editing ? { ...b, title, commands } : b))
        : [...prev, { id: `c${Date.now()}`, title, commands }];
      persistCustom(next);
      return next;
    });
    setEditing(null);
    store.showToast(`✓ ${t("customBlocks.saved")}`);
  };

  const deleteCustom = (id: string) => {
    setCustom((prev) => {
      const next = prev.filter((b) => b.id !== id);
      persistCustom(next);
      return next;
    });
    if (editing === id) setEditing(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = blocks.filter((b) => {
      if (filter === "fav" && !favs.includes(blockKey(b, 0))) return false;
      if (filter !== "all" && filter !== "fav" && b.section !== filter) return false;
      if (!q) return true;
      return `${b.section} ${b.title} ${b.commands.join(" ")}`.toLowerCase().includes(q);
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, query, filter, favs]);

  const filteredCustom = useMemo(() => {
    if (filter !== "all" && filter !== "custom") return [];
    const q = query.trim().toLowerCase();
    return custom.filter(
      (b) => !q || `${b.title} ${b.commands.join(" ")}`.toLowerCase().includes(q)
    );
  }, [custom, query, filter]);

  const totalLines = useMemo(
    () => blocks.reduce((n, b) => n + b.commands.length, 0),
    [blocks]
  );

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  };

  const chip = (key: string, label: string, icon?: ReactNode, count?: number) => (
    <button
      key={key}
      className={`chip ${filter === key ? "chip--on" : ""}`}
      onClick={() => setFilter(key)}
    >
      {icon}
      {label}
      {count !== undefined && <span className="chip__count">{count}</span>}
    </button>
  );

  return (
    <div className="page">
      <div className="card__head" style={{ marginBottom: 12 }}>
        <button className="btn btn--ghost btn--sm" onClick={onBack}>
          <ChevronLeft size={14} />
          {t("titlebar.back")}
        </button>
        <div className="card__title" style={{ marginRight: "auto", marginLeft: 4 }}>
          <div className="card__icon">
            <Terminal size={14} />
          </div>
          {t("commands.title")}
        </div>
        <span className="hint">
          {blocks.length} · {totalLines} {t("commands.items")}
        </span>
      </div>

      <div className="search">
        <Search size={14} />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("commands.search")}
          spellCheck={false}
        />
        {query && (
          <button className="search__clear" onClick={() => setQuery("")}>
            <X size={13} />
          </button>
        )}
      </div>

      <div className="chip-row" style={{ margin: "10px 0 4px" }}>
        {chip("all", t("commands.all"), <LayoutGrid size={12} />, blocks.length + custom.length)}
        {chip("fav", t("commands.fav"), <Star size={12} />, favs.length)}
        {chip("custom", t("customBlocks.name"), <Pencil size={12} />, custom.length)}
        {sections.map((s) =>
          chip(s, sectionLabel(SECTION_META[s], s, lang), null, undefined)
        )}
        <button
          className="chip chip--add"
          onClick={() => {
            setFilter("custom");
            setEditing("__new__");
            setEditTitle("");
            setEditText("");
          }}
        >
          <Plus size={12} />
          {t("customBlocks.add")}
        </button>
      </div>

      {filteredCustom.length === 0 && filter === "custom" && custom.length === 0 && (
        <div className="empty">
          <Pencil size={28} />
          {t("customBlocks.empty")}
        </div>
      )}

      {filter === "custom" && (
        <>
          {editing === "__new__" && (
            <div className="card cmd-block custom-edit fade-in">
              <input
                className="text-input"
                style={{ width: "100%" }}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={t("customBlocks.titlePlaceholder")}
              />
              <textarea
                className="text-input custom-edit__area"
                rows={3}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder={t("customBlocks.commandsPlaceholder")}
                spellCheck={false}
              />
              <div className="row">
                <button className="btn btn--primary btn--sm" onClick={saveEdit}>
                  <Save size={13} />
                  {t("customBlocks.save")}
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>
                  {t("titlebar.back")}
                </button>
              </div>
            </div>
          )}
          {filteredCustom.map((b) => (
            <div key={b.id} className="card cmd-block">
              {editing === b.id ? (
                <div className="stack">
                  <input
                    className="text-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t("customBlocks.titlePlaceholder")}
                  />
                  <textarea
                    className="text-input custom-edit__area"
                    rows={3}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder={t("customBlocks.commandsPlaceholder")}
                    spellCheck={false}
                  />
                  <div className="row">
                    <button className="btn btn--primary btn--sm" onClick={saveEdit}>
                      <Save size={13} />
                      {t("customBlocks.save")}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>
                      {t("titlebar.back")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="cmd-block__head">
                    <span className="cmd-block__sec-icon">
                      <Pencil size={13} />
                    </span>
                    <div className="cmd-block__title">
                      {b.title}
                      <div className="cmd-block__desc">
                        <Highlight text={t("customBlocks.name")} query={query} />
                      </div>
                    </div>
                    <button className="star-btn" onClick={() => startEdit(b)}>
                      <Pencil size={14} />
                    </button>
                    <button
                      className="star-btn"
                      style={{ color: "var(--red)" }}
                      onClick={() => deleteCustom(b.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      className="cmd-block__copy"
                      onClick={() => copy(b.commands.join("\n"), `custom:${b.id}`)}
                    >
                      {copied === `custom:${b.id}` ? <Check size={12} /> : <Copy size={12} />}
                      {copied === `custom:${b.id}` ? t("commands.copied") : t("commands.copy")}
                    </button>
                  </div>
                  {b.commands.map((c, j) => (
                    <div
                      key={j}
                      className="cmd-block__line"
                      onClick={() => copy(c, `custom:${b.id}:${j}`)}
                    >
                      <Highlight text={c} query={query} />
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </>
      )}

      {filtered.length === 0 && (
        <div className="empty">
          <Search size={28} />
          {filter === "fav" && favs.length === 0 ? t("commands.noFav") : t("commands.empty")}
        </div>
      )}

      {filtered.map((b, i) => {
        const key = blockKey(b, i);
        const meta = SECTION_META[b.section];
        const Icon = meta?.icon ?? Terminal;
        const desc = descFor(b.commands, lang as Lang);
        const isFav = favs.includes(key);
        const isTeam = b.commands.some((c) => c.includes("bot_add_"));
        return (
          <div key={key} className="card cmd-block">
            <div className="cmd-block__head">
              {Icon && (
                <span className={`cmd-block__sec-icon ${meta ? "" : ""}`}>
                  <Icon size={13} />
                </span>
              )}
              <div className="cmd-block__title">
                {(b.title || b.commands[0]?.split(" ")[0]) ?? "—"}
                {desc && (
                  <div className="cmd-block__desc">
                    <Highlight text={desc} query={query} />
                  </div>
                )}
              </div>
              <button
                className={`star-btn ${isFav ? "star-btn--on" : ""}`}
                title={t("commands.fav")}
                onClick={() => toggleFav(key)}
              >
                <Star size={14} fill={isFav ? "currentColor" : "none"} />
              </button>
              <button
                className="cmd-block__copy"
                onClick={() => copy(b.commands.join("\n"), key)}
              >
                {copied === key ? <Check size={12} /> : <Copy size={12} />}
                {copied === key ? t("commands.copied") : t("commands.copy")}
              </button>
            </div>
            {b.commands.map((c, j) => {
              const side = isTeam
                ? c.includes("bot_add_ct")
                  ? "CT"
                  : c.includes("bot_add_t")
                    ? "T"
                    : null
                : null;
              return (
                <div
                  key={j}
                  className="cmd-block__line"
                  onClick={() => copy(c, `${key}:${j}`)}
                >
                  {side && <span className={`cmd-side cmd-side--${side.toLowerCase()}`}>{side}</span>}
                  <Highlight text={c} query={query} />
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="footer-note">CBIC · Commands.txt · {t("commands.footerHint")}</div>
    </div>
  );
}
