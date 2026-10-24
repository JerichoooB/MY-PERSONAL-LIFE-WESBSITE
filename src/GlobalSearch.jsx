import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  X,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  CheckSquare,
  CalendarDays,
  NotebookPen,
  BookHeart,
  Target,
  Flame,
  Wallet,
  FolderKanban,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import {
  SEARCH_TYPES,
  searchWorkspace,
  highlightMatches,
  normalizeSearch,
} from "./search";
import "./search.css";
const icons = {
  tasks: CheckSquare,
  events: CalendarDays,
  notes: NotebookPen,
  diary: BookHeart,
  goals: Target,
  habits: Flame,
  transactions: Wallet,
  projects: FolderKanban,
};
const destinations = [
  { title: "Overview", route: "/", Icon: LayoutDashboard },
  ...SEARCH_TYPES.filter((t) => t.kind !== "habits").map((t) => ({
    title: t.kind === "goals" ? "Goals & Habits" : t.label,
    route: t.route,
    Icon: icons[t.kind],
  })),
  { title: "Finance", route: "/finance", Icon: Wallet },
  { title: "Settings", route: "/settings", Icon: Settings },
];
function Highlight({ text, query }) {
  return highlightMatches(text, query).map((p, i) =>
    p.match ? (
      <mark key={i}>{p.text}</mark>
    ) : (
      <React.Fragment key={i}>{p.text}</React.Fragment>
    ),
  );
}
export default function GlobalSearch({ data, onOpen, disabled = false }) {
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [active, setActive] = useState(0);
  const [limit, setLimit] = useState(30);
  const input = useRef();
  const panel = useRef();
  const trigger = useRef();
  const returnFocus = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const normalized = normalizeSearch(query);
  const results = useMemo(() => searchWorkspace(data, query), [data, query]);
  const filtered =
    kind === "all" ? results : results.filter((r) => r.kind === kind);
  const options = normalized
    ? filtered.slice(0, limit)
    : destinations.filter(
        (d) =>
          kind === "all" ||
          SEARCH_TYPES.find((t) => t.kind === kind)?.route === d.route,
      );
  const show = () => {
    returnFocus.current = document.activeElement;
    setQuery("");
    setKind("all");
    setActive(0);
    setLimit(30);
    setOpened(true);
  };
  const close = (restore = true) => {
    setOpened(false);
    if (restore)
      requestAnimationFrame(() => {
        const target = returnFocus.current?.isConnected
          ? returnFocus.current
          : trigger.current;
        target?.focus();
      });
  };
  useEffect(() => {
    const handler = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "k" &&
        !e.altKey
      ) {
        if (disabled || (!opened && document.querySelector('[role="dialog"]')))
          return;
        e.preventDefault();
        if (opened) close();
        else show();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [opened, disabled]);
  useEffect(() => {
    setOpened(false);
  }, [location.pathname]);
  useEffect(() => {
    setActive(0);
    setLimit(30);
  }, [query, kind]);
  useEffect(() => {
    if (!opened) return;
    input.current?.focus();
    const old = document.body.style.overflow;
    const app = document.querySelector(".app");
    const previouslyInert = app?.inert;
    if (app) app.inert = true;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      if (app) app.inert = previouslyInert;
    };
  }, [opened]);
  useEffect(() => {
    panel.current
      ?.querySelector(`[data-result-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, opened]);
  const choose = (result) => {
    close(false);
    const app = document.querySelector(".app");
    if (app) app.inert = false;
    trigger.current?.focus();
    navigate(result.route);
    if (result.item) onOpen(result.kind, result.item);
    else
      requestAnimationFrame(() => {
        const title = document.querySelector("main h1");
        if (title) {
          title.tabIndex = -1;
          title.focus();
        }
      });
  };
  const keyboard = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
    if (
      e.target === input.current &&
      ["ArrowDown", "ArrowUp"].includes(e.key)
    ) {
      e.preventDefault();
      setActive((a) =>
        options.length
          ? (a + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
            options.length
          : 0,
      );
    }
    if (e.key === "Enter" && e.target === input.current) {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    }
    if (e.key === "Tab") {
      const focusable = [
        ...panel.current.querySelectorAll("input,button"),
      ].filter(
        (el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length,
      );
      const first = focusable[0],
        last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };
  const apple =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <>
      <button
        ref={trigger}
        className="global-search search-trigger"
        onClick={show}
        aria-label="Open global search"
        aria-haspopup="dialog"
        disabled={disabled}
      >
        <Search size={19} />
        <span>Search workspace…</span>
        <kbd>{apple ? "⌘" : "Ctrl"} K</kbd>
      </button>
      {opened &&
        createPortal(
          <div
            className="search-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <section
              ref={panel}
              className="search-palette"
              role="dialog"
              aria-modal="true"
              aria-labelledby="search-heading"
              onKeyDown={keyboard}
            >
              <h2 id="search-heading" className="search-visually-hidden">
                Search workspace
              </h2>
              <div className="palette-input-row">
                <Search size={23} />
                <input
                  ref={input}
                  role="combobox"
                  aria-label="Global search"
                  aria-expanded="true"
                  aria-controls="workspace-search-results"
                  aria-activedescendant={
                    options[active] ? `workspace-result-${active}` : undefined
                  }
                  aria-autocomplete="list"
                  placeholder="Find anything in your workspace…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                />
                {query && (
                  <button
                    aria-label="Clear search"
                    className="palette-clear"
                    onClick={() => {
                      setQuery("");
                      input.current?.focus();
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  className="palette-escape"
                  aria-label="Close search"
                  onClick={() => close()}
                >
                  Esc
                </button>
              </div>
              <div
                className="search-type-filters"
                role="group"
                aria-label="Search record type"
              >
                {[{ kind: "all", label: "All" }, ...SEARCH_TYPES].map((t) => (
                  <button
                    key={t.kind}
                    aria-pressed={kind === t.kind}
                    className={kind === t.kind ? "selected" : ""}
                    onClick={() => {
                      setKind(t.kind);
                      input.current?.focus();
                    }}
                  >
                    {t.label}
                    {normalized && results.some((r) => r.kind === t.kind) && (
                      <small>
                        {results.filter((r) => r.kind === t.kind).length}
                      </small>
                    )}
                  </button>
                ))}
              </div>
              <div className="palette-caption" aria-live="polite">
                {normalized
                  ? `${filtered.length} ${filtered.length === 1 ? "result" : "results"}${kind === "all" ? " across your workspace" : ""}`
                  : "JUMP TO A PAGE"}
                <span>
                  {normalized
                    ? "Select a result to open"
                    : "Search titles and content"}
                </span>
              </div>
              <div
                id="workspace-search-results"
                className="palette-results search-results"
                role="listbox"
                aria-label="Workspace search results"
              >
                {options.map((r, i) => {
                  const Icon = r.Icon || icons[r.kind];
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      tabIndex={-1}
                      id={`workspace-result-${i}`}
                      data-result-index={i}
                      className={`palette-result ${i === active ? "active" : ""}`}
                      key={r.item ? `${r.kind}:${r.item.id}` : r.route}
                      onMouseMove={() => setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(r)}
                    >
                      <span
                        className={`palette-record-icon ${r.kind || "page"}`}
                      >
                        <Icon size={19} />
                      </span>
                      <div>
                        <strong>
                          <Highlight
                            text={r.item?.title || r.title}
                            query={query}
                          />
                        </strong>
                        {r.item && (
                          <p>
                            <Highlight
                              text={r.preview || r.label}
                              query={query}
                            />
                          </p>
                        )}
                      </div>
                      <span className="palette-record-type">
                        {r.label || "Page"}
                      </span>
                      <ArrowUpRight className="palette-open-icon" size={16} />
                    </button>
                  );
                })}
              </div>
              {normalized && !filtered.length && (
                <div className="palette-empty">
                  <Search size={28} />
                  <h3>No matches for “{query.slice(0, 60)}”</h3>
                  <p>
                    Try a title, category, tag, amount, or a few words from your
                    content.
                  </p>
                  {kind !== "all" && results.length > 0 && (
                    <button onClick={() => setKind("all")}>
                      Search all types · {results.length} results
                    </button>
                  )}
                </div>
              )}
              {normalized && filtered.length > limit && (
                <button
                  className="palette-more"
                  onClick={() => setLimit((n) => n + 30)}
                >
                  Show more results ({filtered.length - limit} remaining)
                </button>
              )}
              <div className="palette-footer">
                <span>
                  <kbd>
                    <ArrowUp size={11} />
                  </kbd>
                  <kbd>
                    <ArrowDown size={11} />
                  </kbd>{" "}
                  Navigate{" "}
                  <kbd>
                    <CornerDownLeft size={11} />
                  </kbd>{" "}
                  Open
                </span>
                <span>Only data on this device</span>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
