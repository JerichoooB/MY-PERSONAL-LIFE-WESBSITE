import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
import {
  Routes,
  Route,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  NotebookPen,
  Target,
  Wallet,
  FolderKanban,
  Settings,
  Search,
  Plus,
  Bell,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  PanelLeftClose,
  Menu,
  X,
  Check,
  Trash2,
  Pencil,
  Pin,
  Sun,
  Moon,
  Flame,
  MoreHorizontal,
  Download,
  Upload,
  Layers,
  Clock,
  TrendingUp,
  BookOpen,
  Code2,
  Dumbbell,
  Grid2X2,
  List,
  LogOut,
  BookHeart,
  House,
  ChartNoAxesColumn,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import Offline from "./Offline";
import GlobalSearch from "./GlobalSearch";
import {
  repository,
  initialData,
  dateKey,
  addDays,
  uid,
  streaks,
  STORAGE_KEY,
} from "./data";
const Ctx = createContext();
const useApp = () => useContext(Ctx);
const nav = [
  ["/", "Overview", LayoutDashboard],
  ["/tasks", "Tasks", CheckSquare],
  ["/calendar", "Calendar", CalendarDays],
  ["/notes", "Notes", NotebookPen],
  ["/diary", "Diary", BookHeart],
  ["/goals", "Goals & Habits", Target],
  ["/finance", "Finance", Wallet],
  ["/projects", "Projects", FolderKanban],
];
const colors = [
  "#8B5CF6",
  "#38BDF8",
  "#22C55E",
  "#F59E0B",
  "#F472B6",
  "#A78BFA",
  "#EF4444",
];
const currency = (v, c = "PHP") =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 2,
  }).format(v);
let datePreference = "medium";
const nice = (s, opts) => {
  if (!s) return "No date";
  if (!opts && datePreference === "iso") return s.slice(0, 10);
  return new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString(
    "en-US",
    opts || {
      month: datePreference === "long" ? "long" : "short",
      day: "numeric",
      year: "numeric",
    },
  );
};
const Badge = ({ children, color = "" }) => (
  <span className={`badge ${color}`}>{children}</span>
);
function Empty({
  icon: Icon = Layers,
  title = "A little space for what’s next",
  text = "Add your first item to get started.",
  action,
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={25} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Button({ children, onClick, secondary = false, ...props }) {
  return (
    <button
      className={`button ${secondary ? "secondary" : ""}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
function Progress({ value }) {
  return (
    <div className="progress">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Confirm({ onConfirm, children }) {
  const { confirm } = useApp();
  return (
    <button
      className="icon-button danger"
      title="Delete"
      aria-label="Delete"
      onClick={() =>
        confirm("Delete this item? This cannot be undone.", onConfirm)
      }
    >
      {children || <Trash2 size={16} />}
    </button>
  );
}
function App() {
  const [data, setDataState] = useState(repository.load);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  datePreference = data.settings.dateFormat;
  const saveError = useRef(false);
  const dataRef = useRef(data);
  const setData = useCallback((value) => {
    const next = typeof value === "function" ? value(dataRef.current) : value;
    dataRef.current = next;
    if (!next.loadError) {
      try {
        repository.save(next);
        saveError.current = false;
      } catch {
        if (!saveError.current) {
          setToast(
            "Storage is full or unavailable. Export your data to keep your changes.",
          );
          saveError.current = true;
        }
      }
    }
    setDataState(next);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
    document.documentElement.style.setProperty(
      "--accent",
      data.settings.accent,
    );
    if (data.loadError) return;
    try {
      repository.save(data);
      saveError.current = false;
    } catch {
      if (!saveError.current) {
        setToast(
          "Storage is full or unavailable. Export your data to keep your changes.",
        );
        saveError.current = true;
      }
    }
  }, [data]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    setDrawer(false);
    setNotifications(false);
  }, [location.pathname]);
  const update = (key, fn) =>
    setData((d) => ({
      ...d,
      [key]: typeof fn === "function" ? fn(d[key]) : fn,
    }));
  const put = (key, item) => {
    update(key, (items) =>
      items.some((i) => i.id === item.id)
        ? items.map((i) => (i.id === item.id ? item : i))
        : [item, ...items],
    );
  };
  const remove = (key, id) =>
    update(key, (items) => items.filter((i) => i.id !== id));
  const open = (kind, item = null, extra = {}) =>
    setModal({ kind, item, extra });
  const toggleTask = (t) =>
    put("tasks", {
      ...t,
      completed: !t.completed,
      completedAt: t.completed ? null : new Date().toISOString(),
    });
  const toggleHabit = (h) => {
    const today = dateKey();
    put("habits", {
      ...h,
      dates: h.dates.includes(today)
        ? h.dates.filter((d) => d !== today)
        : [...h.dates, today],
    });
  };
  const confirm = (message, run) => setConfirmation({ message, run });
  const ctx = {
    data,
    setData,
    update,
    put,
    remove,
    open,
    toggleTask,
    toggleHabit,
    confirm,
    notify: setToast,
  };
  const today = dateKey();
  const due = data.tasks.filter(
    (t) => !t.completed && t.date && t.date <= today,
  );
  const upcoming = data.events
    .filter((e) => new Date(e.start) >= new Date())
    .sort((a, b) => a.start.localeCompare(b.start));
  const title =
    nav.find(([path]) => path === location.pathname)?.[1] ||
    (location.pathname === "/settings" ? "Settings" : "Overview");
  return (
    <Ctx.Provider value={ctx}>
      <div className={`app ${collapsed ? "collapsed" : ""}`}>
        {drawer && (
          <button
            className="drawer-backdrop"
            aria-label="Close navigation"
            onClick={() => setDrawer(false)}
          />
        )}
        <aside
          inert={!drawer}
          aria-hidden={!drawer}
          className={`sidebar ${drawer ? "drawer-open" : ""}`}
        >
          <NavLink to="/" className="brand">
            <span className="logo">
              <Layers size={25} />
            </span>
            <div>
              <strong>
                Life<span>OS</span>
              </strong>
              <small>Personal Workspace</small>
            </div>
          </NavLink>
          <div className="nav-caption">WORKSPACE</div>
          <nav>
            {nav.map(([path, label, Icon]) => (
              <NavLink key={path} to={path} end={path === "/"} title={label}>
                <Icon size={19} />
                <span>{label}</span>
                {path === "/tasks" &&
                  data.tasks.filter((t) => !t.completed).length > 0 && (
                    <small>
                      {data.tasks.filter((t) => !t.completed).length}
                    </small>
                  )}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="focus-card">
              <span className="sparkle">✧</span>
              <strong>A little progress, every day.</strong>
              <p>Make room for what matters.</p>
            </div>
            <NavLink className="settings-link" to="/settings">
              <Settings size={19} />
              <span>Settings</span>
            </NavLink>
            <button className="profile" onClick={() => navigate("/settings")}>
              <Avatar />
              <div>
                <strong>{data.settings.name || "Your workspace"}</strong>
                <small>Personal account</small>
              </div>
              <MoreHorizontal size={18} />
            </button>
            <button
              className="collapse-button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Toggle sidebar"
            >
              <PanelLeftClose size={17} />
              <span>Collapse sidebar</span>
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setDrawer(!drawer)}
            >
              <Menu size={21} />
            </button>
            <nav className="primary-navigation" aria-label="Primary">
              <NavLink to="/" end>
                <House size={24} />
                <span>Home</span>
              </NavLink>
              <NavLink to="/finance">
                <ChartNoAxesColumn size={24} />
                <span>Statistic</span>
              </NavLink>
              <button onClick={() => open("tasks")}>
                <Plus size={27} />
                <span>Add</span>
              </button>
            </nav>
            <NavLink
              className="center-wordmark"
              to="/"
              aria-label="RIRI.DEV home"
            >
              RIRI<span>.DEV</span>
            </NavLink>
            <div className="top-actions">
              <GlobalSearch
                data={data}
                onOpen={open}
                disabled={!!modal || !!confirmation || drawer}
              />
              <button
                className="quick-add"
                onClick={() => open("tasks")}
                title="Quick add task"
              >
                <Plus size={18} />
                <span>Quick add</span>
              </button>
              <div className="notification-wrap">
                <button
                  className="icon-button notification-button"
                  aria-label="Notifications"
                  onClick={() => setNotifications(!notifications)}
                >
                  <Bell size={19} />
                  {due.length > 0 && <i />}
                </button>
                {notifications && (
                  <div className="notification-panel">
                    <h3>Your reminders</h3>
                    {due.length ? (
                      due.map((t) => (
                        <button key={t.id} onClick={() => open("tasks", t)}>
                          <CheckSquare size={16} />
                          <div>
                            {t.title}
                            <small>
                              {t.date < today ? "Overdue" : "Due today"}
                            </small>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p>You’re all caught up. Enjoy your day.</p>
                    )}
                  </div>
                )}
              </div>
              <span className="top-divider" />
              <button
                className="avatar-button"
                aria-label="Profile settings"
                onClick={() => navigate("/settings")}
              >
                <Avatar />
              </button>
            </div>
          </header>
          {data.loadError && (
            <div className="storage-error">
              {data.loadError}{" "}
              <button
                onClick={() => {
                  const blob = new Blob(
                    [localStorage.getItem(STORAGE_KEY) || ""],
                    { type: "application/json" },
                  );
                  download(blob, "lifeos-recovery.json");
                }}
              >
                Download saved data
              </button>
            </div>
          )}
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/diary" element={<Diary />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="*"
                element={
                  <Empty
                    title="Page not found"
                    action={<NavLink to="/">Return to overview</NavLink>}
                  />
                }
              />
            </Routes>
            <footer>
              <span>LifeOS · Your life, a little more organized.</span>
              <span>
                <i /> All data stored on this device
              </span>
            </footer>
          </motion.main>
        </div>
        <AnimatePresence>
          {modal && (
            <Editor
              key={modal.item?.id || modal.kind}
              {...modal}
              close={() => setModal(null)}
            />
          )}
        </AnimatePresence>
        {confirmation && (
          <Modal title="Just checking" close={() => setConfirmation(null)}>
            <p className="confirm-text">{confirmation.message}</p>
            <div className="form-actions">
              <Button secondary onClick={() => setConfirmation(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  confirmation.run();
                  setConfirmation(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </Modal>
        )}
        {toast && (
          <div role="status" className="toast">
            <Check size={17} />
            {toast}
            <button aria-label="Dismiss" onClick={() => setToast("")}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
function Avatar() {
  const { data } = useApp();
  const s = data.settings;
  return (
    <span className="avatar">
      {s.avatar ? (
        <img src={s.avatar} alt="Profile" />
      ) : (
        (s.name || "You")
          .split(" ")
          .map((s) => s[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      )}
    </span>
  );
}
function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  detail,
  color = "purple",
  children,
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${color}`}>
          <Icon size={18} />
        </span>
      </div>
      <strong>{value}</strong>
      <div className="stat-detail">{detail}</div>
      {children}
    </div>
  );
}
function TaskRow({ task: t }) {
  const { toggleTask, open } = useApp();
  return (
    <div className={`task-row ${t.completed ? "done" : ""}`}>
      <button
        className={`checkbox ${t.completed ? "checked" : ""}`}
        aria-label={`${t.completed ? "Reopen" : "Complete"} ${t.title}`}
        onClick={() => toggleTask(t)}
      >
        {t.completed && <Check size={13} />}
      </button>
      <button className="task-title" onClick={() => open("tasks", t)}>
        <strong>{t.title}</strong>
        <small>
          {t.category}
          {t.time && ` · ${t.time}`}
        </small>
      </button>
      <Badge color={t.priority.toLowerCase()}>
        <i />
        {t.priority}
      </Badge>
    </div>
  );
}
function Overview() {
  const { data, open, toggleTask } = useApp();
  const today = dateKey(),
    tomorrow = addDays(today, 1);
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(today);
  const current = data.tasks.filter(
    (t) => category === "All" || t.category === category,
  );
  const due = data.tasks.filter(
    (t) => !t.completed && t.date && t.date <= today,
  );
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const possible = data.habits.length * 7;
  const checked = data.habits.reduce(
    (s, h) => s + h.dates.filter((d) => week.includes(d)).length,
    0,
  );
  const rate = possible ? Math.round((checked / possible) * 100) : 0;
  const weekOffset =
    (new Date(`${selected}T12:00:00`).getDay() - data.settings.weekStart + 7) %
    7;
  const days = Array.from({ length: 7 }, (_, i) =>
    addDays(selected, i - weekOffset),
  );
  const scheduled = [
    ...data.events
      .filter(
        (e) =>
          e.start.slice(0, 10) <= selected && e.end.slice(0, 10) >= selected,
      )
      .map((e) => ({ ...e, kind: "events", time: e.start.slice(11, 16) })),
    ...data.tasks
      .filter((t) => t.date === selected && t.time)
      .map((t) => ({ ...t, kind: "tasks", description: "" })),
  ].sort((a, b) => a.time.localeCompare(b.time));
  const taskCard = (date, title, coral = false) => {
    const tasks = current.filter((t) => t.date === date);
    return (
      <section className={`daily-task-card ${coral ? "coral-card" : ""}`}>
        <div className="daily-card-header">
          <h2>{title}</h2>
          <button
            aria-label={`Add task for ${date}`}
            onClick={() =>
              open("tasks", null, {
                date,
                category: category === "All" ? undefined : category,
              })
            }
          >
            <Plus size={26} />
          </button>
          <span>
            {tasks.filter((t) => t.completed).length}/{tasks.length}
          </span>
        </div>
        {tasks.length ? (
          <div className="daily-task-list">
            {tasks.map((t) => (
              <div
                className={`daily-task ${t.completed ? "complete" : ""}`}
                key={t.id}
              >
                <button
                  className="round-check"
                  aria-label={`${t.completed ? "Reopen" : "Complete"} ${t.title}`}
                  onClick={() => toggleTask(t)}
                >
                  {t.completed && <Check size={14} />}
                </button>
                <button
                  className="daily-task-name"
                  onClick={() => open("tasks", t)}
                >
                  {t.title}
                </button>
                {t.time && <small>{t.time}</small>}
              </div>
            ))}
          </div>
        ) : (
          <div className="daily-empty">
            <span>
              {coral
                ? "A little intention goes a long way."
                : "Leave a little room for tomorrow."}
            </span>
            <button
              onClick={() =>
                open("tasks", null, {
                  date,
                  category: category === "All" ? undefined : category,
                })
              }
            >
              <Plus size={17} />
              {coral ? "Plan your first task" : "Add a task"}
            </button>
          </div>
        )}
      </section>
    );
  };
  return (
    <div className="reference-dashboard">
      <div className="reference-left">
        <NavLink to="/diary" className="diary-feature">
          <img
            src={`${import.meta.env.BASE_URL}diary-desk.svg`}
            alt="An illustrated desk with a pink diary, calendar, and pencil"
          />
          <div>
            <span>
              <strong>My Diary</strong>
              <small>
                {data.diary.length}{" "}
                {data.diary.length === 1 ? "entry" : "entries"} · A space for
                your thoughts
              </small>
            </span>
            <span className="feature-arrow">
              <ArrowRight size={30} />
            </span>
          </div>
        </NavLink>
        <NavLink to="/tasks" className="reminders-feature">
          <div>
            <NotebookPen size={33} />
            <strong>
              {due.length} {due.length === 1 ? "Reminder" : "Reminders"}
            </strong>
            <small>
              {due.length
                ? "A few things need your attention"
                : "All caught up. A little room to breathe."}
            </small>
          </div>
          <span className="feature-arrow">
            <ArrowRight size={29} />
          </span>
        </NavLink>
        <section className="habit-feature">
          <div className="habit-feature-number">
            {rate}
            <span>%</span>
          </div>
          <h2>Habit success rate</h2>
          <p>Your last seven days, one step at a time.</p>
          <div className="reference-habit-chart">
            {week.map((d) => {
              const n = data.habits.filter((h) => h.dates.includes(d)).length;
              const pct = data.habits.length
                ? Math.round((n / data.habits.length) * 100)
                : 0;
              return (
                <div key={d}>
                  <span>{pct}%</span>
                  <div className="habit-bar-track">
                    <i
                      style={{ height: `${Math.max(3, pct)}%` }}
                      className={d === today ? "current" : ""}
                    />
                  </div>
                  <small>
                    {nice(d, { day: "numeric" })}{" "}
                    {nice(d, { weekday: "narrow" })}
                  </small>
                </div>
              );
            })}
          </div>
          <NavLink className="habit-feature-link" to="/goals">
            Build your daily rhythm <ArrowUpRight size={15} />
          </NavLink>
        </section>
        <NavLink to="/notes" className="notes-feature">
          <NotebookPen size={22} />
          <div>
            <strong>Your ideas live here</strong>
            <small>{data.notes.length} notes in your workspace</small>
          </div>
          <ArrowUpRight size={21} />
        </NavLink>
      </div>
      <div className="reference-center">
        <div className="my-tasks-heading">
          <div>
            <span className="reference-eyebrow">
              MAKE SPACE FOR WHAT MATTERS
            </span>
            <h1>My Tasks</h1>
          </div>
          <button
            className="round-add"
            aria-label="New Task"
            onClick={() =>
              open("tasks", null, {
                category: category === "All" ? undefined : category,
              })
            }
          >
            <Plus size={29} />
          </button>
        </div>
        <div className="category-chips">
          {["All", ...data.categories].map((c) => (
            <button
              aria-pressed={category === c}
              className={category === c ? "active" : ""}
              key={c}
              onClick={() => setCategory(c)}
            >
              {c}
              {c === "All" && <span>({data.tasks.length})</span>}
            </button>
          ))}
          <button
            className="category-more"
            aria-label="Add category"
            onClick={() => open("category", null, { onCreated: setCategory })}
          >
            <Plus size={19} />
            <span>Add category</span>
          </button>
        </div>
        {taskCard(today, "Today", true)}
        {taskCard(
          tomorrow,
          `Tomorrow (${nice(tomorrow, { month: "short", day: "numeric" })})`,
        )}
        <div className="overview-bottom">
          <NavLink to="/tasks">
            All tasks <ArrowUpRight size={18} />
          </NavLink>
          <NavLink to="/projects">
            Projects <FolderKanban size={17} />
          </NavLink>
        </div>
        <div className="overview-goals">
          <div>
            <Target size={23} />
            <span>
              <strong>
                {data.goals.filter((g) => g.progress < 100).length} active goals
              </strong>
              <small>Keep the bigger picture in sight.</small>
            </span>
          </div>
          <NavLink to="/goals" aria-label="View goals">
            <ArrowRight size={24} />
          </NavLink>
        </div>
      </div>
      <section className="reference-agenda">
        <div className="agenda-title">
          <h2>Calendar</h2>
          <button
            className="round-add"
            aria-label="Add event"
            onClick={() => open("events", null, { date: selected })}
          >
            <Plus size={29} />
          </button>
        </div>
        <div className="reference-week-nav">
          <button
            className="icon-button"
            aria-label="Previous week"
            onClick={() => setSelected(addDays(selected, -7))}
          >
            <ChevronLeft size={16} />
          </button>
          <span>{nice(selected, { month: "long", year: "numeric" })}</span>
          <button
            className="icon-button"
            aria-label="Next week"
            onClick={() => setSelected(addDays(selected, 7))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="reference-week">
          {days.map((d) => (
            <button
              key={d}
              className={d === selected ? "active" : ""}
              onClick={() => setSelected(d)}
            >
              <small>{nice(d, { weekday: "short" })}</small>
              <strong>{Number(d.slice(-2))}</strong>
              <i />
            </button>
          ))}
        </div>
        {["Morning", "Afternoon", "Evening"].map((period, i) => {
          const entries = scheduled.filter((e) => {
            const hour = Number(e.time.slice(0, 2));
            return i === 0
              ? hour < 12
              : i === 1
                ? hour >= 12 && hour < 18
                : hour >= 18;
          });
          return (
            <div className="agenda-period" key={period}>
              <h3>{period}</h3>
              {entries.length ? (
                entries.map((e, j) => (
                  <button
                    key={e.kind + e.id}
                    className={`reference-event ${i === 0 && j === 0 ? "highlight" : ""}`}
                    onClick={() => open(e.kind, e)}
                  >
                    <span className="reference-event-time">
                      {new Date(`2000-01-01T${e.time}`).toLocaleTimeString(
                        "en-US",
                        { hour: "numeric", minute: "2-digit" },
                      )}
                      <small>{e.category}</small>
                    </span>
                    <div>
                      <strong>
                        <span
                          className={`event-circle ${e.completed ? "filled" : ""}`}
                        >
                          {e.completed && <Check size={12} />}
                        </span>
                        {e.title}
                      </strong>
                      {e.description && <p>{e.description}</p>}
                    </div>
                  </button>
                ))
              ) : (
                <button
                  className="agenda-free"
                  onClick={() => open("events", null, { date: selected })}
                >
                  <span className="free-line" />
                  <span>A little free time</span>
                  <Plus size={16} />
                </button>
              )}
            </div>
          );
        })}
        {data.tasks.some((t) => t.date === selected && !t.time) && (
          <div className="agenda-all-day">
            <span>Any time</span>
            {data.tasks
              .filter((t) => t.date === selected && !t.time)
              .map((t) => (
                <button key={t.id} onClick={() => open("tasks", t)}>
                  <CheckSquare size={15} />
                  {t.title}
                </button>
              ))}
          </div>
        )}
        <NavLink to="/calendar" className="agenda-full-link">
          Open full calendar <ArrowUpRight size={17} />
        </NavLink>
      </section>
    </div>
  );
}
function MiniCalendar({
  onSelect,
  selected: externalSelected,
  month: externalMonth,
  onMonth,
}) {
  const { data } = useApp();
  const [localMonth, setMonth] = useState(dateKey().slice(0, 7));
  const [selected, setSelected] = useState(dateKey());
  const month = externalMonth || localMonth;
  const pick = externalSelected || selected;
  const first = new Date(`${month}-01T12:00:00`);
  const offset = (first.getDay() - data.settings.weekStart + 7) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const change = (n) => {
    const d = new Date(first);
    d.setMonth(d.getMonth() + n);
    (onMonth || setMonth)(dateKey(d).slice(0, 7));
  };
  return (
    <>
      <div className="calendar-controls">
        <strong>
          {nice(`${month}-01`, { month: "long", year: "numeric" })}
        </strong>
        <div>
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() => change(-1)}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() => change(1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div className="mini-calendar">
        {Array.from(
          { length: 7 },
          (_, i) =>
            ["S", "M", "T", "W", "T", "F", "S"][
              (i + data.settings.weekStart) % 7
            ],
        ).map((d, i) => (
          <span className="weekday" key={i}>
            {d}
          </span>
        ))}
        {Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
          const date = addDays(`${month}-01`, i - offset);
          const has =
            data.events.some(
              (e) => e.start.slice(0, 10) <= date && e.end.slice(0, 10) >= date,
            ) || data.tasks.some((t) => t.date === date);
          return (
            <button
              key={date}
              className={`${date === dateKey() ? "today" : ""} ${date === pick ? "selected" : ""} ${date.slice(0, 7) !== month ? "outside" : ""}`}
              onClick={() => {
                setSelected(date);
                onSelect?.(date);
              }}
            >
              {Number(date.slice(-2))}
              {has && <i />}
            </button>
          );
        })}
      </div>
      {!onSelect && (
        <div className="calendar-selected">
          <span>{nice(pick, { month: "short", day: "numeric" })}</span>
          <small>
            {
              data.events.filter(
                (e) =>
                  e.start.slice(0, 10) <= pick && e.end.slice(0, 10) >= pick,
              ).length
            }{" "}
            events
            {data.tasks.filter((t) => t.date === pick).length > 0 &&
              ` · ${data.tasks.filter((t) => t.date === pick).length} tasks`}
          </small>
          <div>
            {data.events
              .filter(
                (e) =>
                  e.start.slice(0, 10) <= pick && e.end.slice(0, 10) >= pick,
              )
              .map((e) => (
                <div key={e.id} className="mini-event">
                  <i style={{ background: e.color }} />
                  {e.title}
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
function Tasks() {
  const { data, open, update } = useApp();
  const [view, setView] = useState("All Tasks");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("date");
  const today = dateKey();
  const filtered = data.tasks
    .filter(
      (t) =>
        (view === "All Tasks" ||
          (view === "Today" && t.date === today) ||
          (view === "Upcoming" && t.date > today && !t.completed) ||
          (view === "Completed" && t.completed)) &&
        (!priority || t.priority === priority) &&
        (!category || t.category === category) &&
        t.title.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "priority"
        ? ["High", "Medium", "Low"].indexOf(a.priority) -
          ["High", "Medium", "Low"].indexOf(b.priority)
        : sort === "createdAt"
          ? b.createdAt.localeCompare(a.createdAt)
          : (a.date || "9999").localeCompare(b.date || "9999"),
    );
  return (
    <>
      <PageHeader
        title="Tasks"
        description="Clear your mind. Make a plan. Get things done."
        action={
          <Button
            onClick={() =>
              open("tasks", null, { category: category || undefined })
            }
          >
            <Plus size={17} />
            New task
          </Button>
        }
      />
      <Panel
        title="Your to-do, under control"
        action={
          <Badge>
            {data.tasks.filter((t) => t.completed).length} completed
          </Badge>
        }
      >
        <div className="tabs">
          {["All Tasks", "Today", "Upcoming", "Completed"].map((v) => (
            <button
              key={v}
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="filters">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Search tasks"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Priority filter"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">All priorities</option>
            {["High", "Medium", "Low"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="Category filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {data.categories.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="Task sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="date">Due date</option>
            <option value="priority">Priority</option>
            <option value="createdAt">Newest first</option>
          </select>
          <button
            className="text-link"
            onClick={() => open("category", null, { onCreated: setCategory })}
          >
            + Category
          </button>
        </div>
        {filtered.length ? (
          filtered.map((t) => (
            <div className="task-page-row" key={t.id}>
              <TaskRow task={t} />
              <span
                className={`task-date ${t.date < today && !t.completed ? "overdue" : ""}`}
              >
                {nice(t.date)}
              </span>
              <button
                className="icon-button"
                aria-label={`Edit ${t.title}`}
                onClick={() => open("tasks", t)}
              >
                <Pencil size={15} />
              </button>
              <DeleteItem collection="tasks" id={t.id} />
            </div>
          ))
        ) : (
          <Empty
            icon={CheckSquare}
            title="Nothing on your list"
            text="Add a task or adjust your filters."
            action={
              <Button
                onClick={() =>
                  open("tasks", null, { category: category || undefined })
                }
              >
                <Plus size={16} />
                Create task
              </Button>
            }
          />
        )}
      </Panel>
    </>
  );
}
function DeleteItem({ collection, id }) {
  const { remove } = useApp();
  return <Confirm onConfirm={() => remove(collection, id)} />;
}
function CalendarPage() {
  const { data, open } = useApp();
  const [selected, setSelected] = useState(dateKey());
  const [month, setMonth] = useState(dateKey().slice(0, 7));
  const [view, setView] = useState("Month");
  const first = new Date(`${month}-01T12:00:00`);
  const offset = (first.getDay() - data.settings.weekStart + 7) % 7;
  const count = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  const weekOffset =
    (new Date(`${selected}T12:00:00`).getDay() - data.settings.weekStart + 7) %
    7;
  const dates = Array.from(
    { length: view === "Month" ? Math.ceil((offset + count) / 7) * 7 : 7 },
    (_, i) =>
      addDays(
        view === "Month" ? `${month}-01` : selected,
        i - (view === "Month" ? offset : weekOffset),
      ),
  );
  const eventsFor = (date) =>
    data.events.filter(
      (e) => e.start.slice(0, 10) <= date && e.end.slice(0, 10) >= date,
    );
  return (
    <>
      <PageHeader
        title="Calendar"
        description="Make time for the things that matter."
        action={
          <Button onClick={() => open("events", null, { date: selected })}>
            <Plus size={17} />
            New event
          </Button>
        }
      />
      <div className="calendar-layout">
        <Panel title="At a glance">
          <MiniCalendar
            selected={selected}
            month={month}
            onMonth={setMonth}
            onSelect={setSelected}
          />
          <div className="agenda">
            <h3>
              {nice(selected, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h3>
            {eventsFor(selected).map((e) => (
              <button key={e.id} onClick={() => open("events", e)}>
                <i style={{ background: e.color }} />
                <div>
                  <strong>{e.title}</strong>
                  <small>
                    {new Date(e.start).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              </button>
            ))}
            {data.tasks
              .filter((t) => t.date === selected)
              .map((t) => (
                <button key={t.id} onClick={() => open("tasks", t)}>
                  <CheckSquare size={16} />
                  {t.title}
                </button>
              ))}
            {!eventsFor(selected).length &&
              !data.tasks.some((t) => t.date === selected) && (
                <p>No plans for this day.</p>
              )}
          </div>
        </Panel>
        <Panel
          title={
            view === "Month"
              ? nice(`${month}-01`, { month: "long", year: "numeric" })
              : `Week of ${nice(dates[0])}`
          }
          action={
            <div className="segmented">
              {["Month", "Week"].map((v) => (
                <button
                  className={view === v ? "active" : ""}
                  key={v}
                  onClick={() => setView(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          }
        >
          <div className="calendar-toolbar">
            <Button
              secondary
              onClick={() => {
                setMonth(dateKey().slice(0, 7));
                setSelected(dateKey());
              }}
            >
              Today
            </Button>
            <div>
              <button
                className="icon-button"
                aria-label="Previous period"
                onClick={() => {
                  if (view === "Week") setSelected(addDays(selected, -7));
                  else {
                    const d = new Date(first);
                    d.setMonth(d.getMonth() - 1);
                    setMonth(dateKey(d).slice(0, 7));
                  }
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Next period"
                onClick={() => {
                  if (view === "Week") setSelected(addDays(selected, 7));
                  else {
                    const d = new Date(first);
                    d.setMonth(d.getMonth() + 1);
                    setMonth(dateKey(d).slice(0, 7));
                  }
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div
            className={`full-calendar ${view === "Week" ? "week-view" : ""}`}
          >
            {dates.slice(0, 7).map((d) => (
              <div className="full-weekday" key={d}>
                {nice(d, { weekday: "short" })}
              </div>
            ))}
            {dates.map((d) => (
              <div
                tabIndex={0}
                role="button"
                aria-label={`Select ${d}`}
                onKeyDown={(e) => {
                  if (
                    e.target === e.currentTarget &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    setSelected(d);
                  }
                }}
                onClick={() => setSelected(d)}
                key={d}
                className={`calendar-cell ${d === selected ? "selected" : ""} ${d.slice(0, 7) !== month && view === "Month" ? "outside" : ""}`}
              >
                <span className={d === dateKey() ? "current-day" : ""}>
                  {Number(d.slice(-2))}
                </span>
                <button
                  className="cell-add"
                  aria-label={`Add event on ${d}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    open("events", null, { date: d });
                  }}
                >
                  <Plus size={13} />
                </button>
                {eventsFor(d).map((e) => (
                  <button
                    className="calendar-event"
                    style={{ "--event-color": e.color }}
                    key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      open("events", e);
                    }}
                  >
                    {e.title}
                  </button>
                ))}
                {data.tasks
                  .filter((t) => t.date === d)
                  .map((t) => (
                    <button
                      className={`calendar-event task ${t.completed ? "done" : ""}`}
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        open("tasks", t);
                      }}
                    >
                      <CheckSquare size={11} />
                      {t.title}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
function Notes() {
  const { data, open, put } = useApp();
  const [query, setQuery] = useState("");
  const [view, setView] = useState("grid");
  const notes = [...data.notes]
    .filter((n) =>
      `${n.title} ${n.content} ${n.tags} ${n.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
  return (
    <>
      <PageHeader
        title="Notes"
        description="A home for your thoughts, ideas, and everything in between."
        action={
          <Button onClick={() => open("notes")}>
            <Plus size={17} />
            New note
          </Button>
        }
      />
      <div className="page-tools">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search notes"
            placeholder="Search notes, tags, or categories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="segmented">
          <button
            aria-label="Grid view"
            className={view === "grid" ? "active" : ""}
            onClick={() => setView("grid")}
          >
            <Grid2X2 size={16} />
          </button>
          <button
            aria-label="List view"
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            <List size={16} />
          </button>
        </div>
      </div>
      {notes.length ? (
        <div className={`notes-grid ${view === "list" ? "list-view" : ""}`}>
          {notes.map((n) => (
            <article className="note-card" key={n.id}>
              <div className="note-card-top">
                <span className="note-icon">
                  <NotebookPen size={20} />
                </span>
                <div>
                  <button
                    className={`icon-button ${n.pinned ? "pinned" : ""}`}
                    aria-label={n.pinned ? "Unpin note" : "Pin note"}
                    onClick={() => put("notes", { ...n, pinned: !n.pinned })}
                  >
                    <Pin size={15} />
                  </button>
                  <DeleteItem collection="notes" id={n.id} />
                </div>
              </div>
              <button className="note-content" onClick={() => open("notes", n)}>
                <h2>{n.title}</h2>
                <p>
                  {n.content.slice(0, 200) ||
                    "No content yet. Open this note to begin writing."}
                </p>
              </button>
              <div className="note-card-bottom">
                <span>
                  {n.category || "Personal"} {n.tags && `· ${n.tags}`}
                </span>
                <small>{nice(n.updatedAt)}</small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Panel>
          <Empty
            icon={NotebookPen}
            title="Your next big idea starts here"
            text="Keep your thoughts, class notes, and little reminders together."
            action={
              <Button onClick={() => open("notes")}>
                <Plus size={16} />
                Write a note
              </Button>
            }
          />
        </Panel>
      )}
    </>
  );
}
const moods = { Great: "☀", Good: "◡", Okay: "◯", Low: "☁", Difficult: "☂" };
function Diary() {
  const { data, open } = useApp();
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");
  const [mood, setMood] = useState("");
  const entries = [...data.diary]
    .filter(
      (e) =>
        (!month || e.date.startsWith(month)) &&
        (!mood || e.mood === mood) &&
        `${e.title} ${e.content}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
    );
  return (
    <>
      <PageHeader
        eyebrow="A MOMENT JUST FOR YOU"
        title="Diary"
        description="Slow down. Check in. Put a little of your day into words."
        action={
          <Button onClick={() => open("diary")}>
            <Plus size={17} />
            Write an entry
          </Button>
        }
      />
      <div className="diary-banner">
        <span>
          <BookHeart size={29} />
        </span>
        <div>
          <h2>How was your day, really?</h2>
          <p>
            The good moments, the messy ones, and everything in between. There’s
            room for all of it here.
          </p>
        </div>
        <button
          className="text-link"
          onClick={() => open("diary", null, { date: dateKey() })}
        >
          Check in today <ArrowRight size={15} />
        </button>
      </div>
      <div className="diary-filters">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search diary"
            placeholder="Search your memories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <input
          type="month"
          aria-label="Diary month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <select
          aria-label="Diary mood filter"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
        >
          <option value="">All moods</option>
          {Object.keys(moods).map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        {(month || mood || query) && (
          <button
            className="text-link"
            onClick={() => {
              setMonth("");
              setMood("");
              setQuery("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>
      {entries.length ? (
        <div className="diary-list">
          {entries.map((e) => (
            <article className="diary-card" key={e.id}>
              <div className="diary-date">
                <strong>{new Date(`${e.date}T12:00:00`).getDate()}</strong>
                <span>{nice(e.date, { month: "short", year: "numeric" })}</span>
                <small>{nice(e.date, { weekday: "long" })}</small>
              </div>
              <button
                className="diary-content"
                onClick={() => open("diary", e)}
              >
                <div>
                  <h2>{e.title}</h2>
                  <Badge>
                    {moods[e.mood]} {e.mood}
                  </Badge>
                </div>
                <p>
                  {e.content.slice(0, 230) || "A page waiting for your story…"}
                </p>
                <small>Edited {nice(e.updatedAt)}</small>
              </button>
              <div className="diary-actions">
                <button
                  className="icon-button"
                  aria-label={`Edit ${e.title}`}
                  onClick={() => open("diary", e)}
                >
                  <Pencil size={16} />
                </button>
                <DeleteItem collection="diary" id={e.id} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Panel>
          <Empty
            icon={BookHeart}
            title={
              query || month || mood
                ? "No entries match your filters"
                : "Every day has a story"
            }
            text="You don’t have to write something profound. Start with how you feel."
            action={
              <Button onClick={() => open("diary")}>
                Write your first entry
              </Button>
            }
          />
        </Panel>
      )}
      <p className="diary-privacy">
        Stored on this device and included in your backups. Anyone with access
        to this browser profile can read your diary.
      </p>
    </>
  );
}
function Goals() {
  const { data, open, put, toggleHabit } = useApp();
  const today = dateKey();
  const [historyMonth, setHistoryMonth] = useState(today.slice(0, 7));
  return (
    <>
      <PageHeader
        title="Goals & Habits"
        description="A little intention today. A little closer tomorrow."
        action={
          <div className="button-group">
            <Button secondary onClick={() => open("habits")}>
              <Plus size={16} />
              New habit
            </Button>
            <Button onClick={() => open("goals")}>
              <Plus size={16} />
              New goal
            </Button>
          </div>
        }
      />
      <div className="stats-grid three">
        <Stat
          icon={Target}
          label="Active goals"
          value={data.goals.filter((g) => g.progress < 100).length}
          detail="Something worth working toward"
        />
        <Stat
          icon={CheckSquare}
          label="Goals achieved"
          value={data.goals.filter((g) => g.progress === 100).length}
          detail="Every milestone counts"
          color="green"
        />
        <Stat
          icon={Flame}
          label="Habits today"
          value={`${data.habits.filter((h) => h.dates.includes(today)).length} / ${data.habits.length}`}
          detail="Consistency over perfection"
          color="orange"
        />
      </div>
      <Panel
        title="Your goals"
        subtitle="Define your direction. Celebrate the progress."
      >
        {data.goals.length ? (
          <div className="goal-grid">
            {data.goals.map((g) => (
              <article className="goal-card" key={g.id}>
                <div className="card-title">
                  <span className="goal-symbol">
                    <Target size={20} />
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Edit goal"
                    onClick={() => open("goals", g)}
                  >
                    <Pencil size={16} />
                  </button>
                  <DeleteItem collection="goals" id={g.id} />
                </div>
                <h3>{g.title}</h3>
                <p>{g.description}</p>
                <div className="goal-meta">
                  <Badge>
                    {g.kind === "savings"
                      ? "Savings goal"
                      : g.progress === 100
                        ? "Completed"
                        : "In progress"}
                  </Badge>
                  <span>{nice(g.date)}</span>
                </div>
                <div className="progress-label">
                  <span>Progress</span>
                  <strong>{g.progress}%</strong>
                </div>
                <input
                  aria-label={`Progress for ${g.title}`}
                  type="range"
                  min="0"
                  max="100"
                  value={g.progress}
                  onChange={(e) =>
                    put("goals", { ...g, progress: Number(e.target.value) })
                  }
                />
                <div className="checklist">
                  {g.milestones.map((m) => (
                    <label key={m.id}>
                      <input
                        type="checkbox"
                        checked={m.done}
                        onChange={() =>
                          put("goals", {
                            ...g,
                            milestones: g.milestones.map((x) =>
                              x.id === m.id ? { ...x, done: !x.done } : x,
                            ),
                          })
                        }
                      />
                      {m.title}
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            icon={Target}
            title="What are you working toward?"
            text="Give a dream a deadline and take your first step."
            action={
              <Button onClick={() => open("goals")}>Set your first goal</Button>
            }
          />
        )}
      </Panel>
      <Panel
        title="Daily habits"
        subtitle="Show up for yourself, one day at a time."
        className="mt"
      >
        <div className="habit-history-toolbar">
          <span>Weekly check-ins & monthly history</span>
          <input
            aria-label="Habit history month"
            type="month"
            value={historyMonth}
            onChange={(e) =>
              setHistoryMonth(e.target.value || today.slice(0, 7))
            }
          />
        </div>
        {data.habits.length ? (
          <div className="habit-cards">
            {data.habits.map((h) => {
              const s = streaks(h.dates);
              const days = new Date(
                Number(historyMonth.slice(0, 4)),
                Number(historyMonth.slice(5)),
                0,
              ).getDate();
              return (
                <div className="habit-card" key={h.id}>
                  <div className="card-title">
                    <h3>
                      <Flame size={18} />
                      {h.title}
                    </h3>
                    <button
                      className="icon-button"
                      aria-label="Edit habit"
                      onClick={() => open("habits", h)}
                    >
                      <Pencil size={15} />
                    </button>
                    <DeleteItem collection="habits" id={h.id} />
                  </div>
                  <div className="streak-stats">
                    <span>
                      <strong>{s.current}</strong> current streak
                    </span>
                    <span>
                      <strong>{s.longest}</strong> best streak
                    </span>
                  </div>
                  <div className="habit-week">
                    {Array.from({ length: 7 }, (_, i) =>
                      addDays(today, i - 6),
                    ).map((d) => (
                      <div key={d}>
                        <small>{nice(d, { weekday: "narrow" })}</small>
                        <span className={h.dates.includes(d) ? "checked" : ""}>
                          {h.dates.includes(d) ? (
                            <Check size={14} />
                          ) : (
                            new Date(`${d}T12:00:00`).getDate()
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="monthly-habit">
                    {Array.from(
                      { length: days },
                      (_, i) =>
                        `${historyMonth}-${String(i + 1).padStart(2, "0")}`,
                    ).map((d) => (
                      <span
                        title={`${d}: ${h.dates.includes(d) ? "completed" : "not completed"}`}
                        className={h.dates.includes(d) ? "checked" : ""}
                        key={d}
                      >
                        {Number(d.slice(-2))}
                      </span>
                    ))}
                  </div>
                  <Button
                    secondary={!h.dates.includes(today)}
                    onClick={() => toggleHabit(h)}
                  >
                    <Check size={15} />
                    {h.dates.includes(today)
                      ? "Completed today"
                      : "Check in today"}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            icon={Flame}
            title="Small habits. Meaningful change."
            text="Create a habit to start tracking your real progress."
            action={
              <Button onClick={() => open("habits")}>Create a habit</Button>
            }
          />
        )}
      </Panel>
    </>
  );
}
function Finance() {
  const { data, open, update } = useApp();
  const [month, setMonth] = useState(dateKey().slice(0, 7));
  const tx = data.transactions.filter((t) => t.date.startsWith(month));
  const income = tx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = tx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const categories = Object.entries(
    tx
      .filter((t) => t.type === "expense")
      .reduce(
        (o, t) => ({ ...o, [t.category]: (o[t.category] || 0) + t.amount }),
        {},
      ),
  ).map(([name, value]) => ({ name, value }));
  const money = (v) => currency(v, data.settings.currency);
  const savingGoals = data.goals.filter((g) => g.kind === "savings");
  return (
    <>
      <PageHeader
        title="Finance"
        description="A clearer picture of your money. A little more peace of mind."
        action={
          <Button onClick={() => open("transactions")}>
            <Plus size={17} />
            Add transaction
          </Button>
        }
      />
      <div className="page-tools">
        <input
          type="month"
          aria-label="Finance month"
          value={month}
          onChange={(e) => setMonth(e.target.value || dateKey().slice(0, 7))}
        />
        <label className="inline-label">
          Monthly budget{" "}
          <input
            type="number"
            min="0"
            step="0.01"
            value={data.settings.budget}
            onChange={(e) =>
              update("settings", (s) => ({
                ...s,
                budget: Math.max(0, Number(e.target.value)),
              }))
            }
          />
        </label>
      </div>
      <div className="stats-grid">
        <Stat
          icon={TrendingUp}
          label="Total income"
          value={money(income)}
          detail={nice(`${month}-01`, { month: "long", year: "numeric" })}
          color="green"
        />
        <Stat
          icon={Wallet}
          label="Total expenses"
          value={money(expenses)}
          detail={`${tx.filter((t) => t.type === "expense").length} transactions`}
          color="orange"
        />
        <Stat
          icon={Target}
          label="Remaining budget"
          value={money(data.settings.budget - expenses)}
          detail={`of ${money(data.settings.budget)} monthly budget`}
        />
        <Stat
          icon={Layers}
          label="Net balance"
          value={money(income - expenses)}
          detail="Monthly income minus expenses"
          color="blue"
        />
      </div>
      <div className="finance-charts">
        <Panel title="Expense breakdown" subtitle="Where your money goes.">
          {categories.length ? (
            <>
              <div className="pie-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {categories.map((c, i) => (
                        <Cell key={c.name} fill={colors[i % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={money}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        color: "var(--text)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend">
                {categories.map((c, i) => (
                  <span key={c.name}>
                    <i style={{ background: colors[i % colors.length] }} />
                    {c.name}
                    <b>{money(c.value)}</b>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <Empty
              icon={Wallet}
              title="A clean slate"
              text="Your spending breakdown appears as you add expenses."
            />
          )}
        </Panel>
        <Panel title="Income vs. expenses" subtitle="Your monthly money flow.">
          <div className="finance-bar">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Income", amount: income },
                  { name: "Expenses", amount: expenses },
                ]}
                margin={{ left: 5, right: 20, top: 25 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={money}
                  cursor={{ fill: "var(--hover)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <Bar dataKey="amount" radius={[7, 7, 0, 0]} maxBarSize={65}>
                  <Cell fill="#22c55e" />
                  <Cell fill="var(--accent)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <Panel
        title="Transactions"
        subtitle={`${tx.length} entries this month`}
        action={
          <Button secondary onClick={() => open("transactions")}>
            <Plus size={15} />
            Add entry
          </Button>
        }
      >
        {tx.length ? (
          <div className="transaction-list">
            {[...tx]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((t) => (
                <div className="transaction-row" key={t.id}>
                  <span className={`transaction-icon ${t.type}`}>
                    <Wallet size={19} />
                  </span>
                  <button onClick={() => open("transactions", t)}>
                    <strong>{t.title}</strong>
                    <small>
                      {t.category} · {nice(t.date)}
                      {t.description && ` · ${t.description}`}
                    </small>
                  </button>
                  <strong className={t.type === "income" ? "green" : ""}>
                    {t.type === "income" ? "+" : "−"}
                    {money(t.amount)}
                  </strong>
                  <button
                    className="icon-button"
                    aria-label="Edit transaction"
                    onClick={() => open("transactions", t)}
                  >
                    <Pencil size={15} />
                  </button>
                  <DeleteItem collection="transactions" id={t.id} />
                </div>
              ))}
          </div>
        ) : (
          <Empty
            title="Start with your first transaction"
            text="Track an expense or record some income."
          />
        )}
      </Panel>
      <Panel
        className="mt"
        title="Savings goals"
        subtitle="Give your future self something to look forward to."
        action={
          <Button
            secondary
            onClick={() => open("goals", null, { kind: "savings" })}
          >
            <Plus size={15} />
            Savings goal
          </Button>
        }
      >
        {savingGoals.length ? (
          <div className="savings-list">
            {savingGoals.map((g) => (
              <button onClick={() => open("goals", g)} key={g.id}>
                <span>
                  {g.title}
                  <b>{g.progress}%</b>
                </span>
                <Progress value={g.progress} />
              </button>
            ))}
          </div>
        ) : (
          <p className="muted padded">
            Set a savings goal and track your progress here.
          </p>
        )}
      </Panel>
    </>
  );
}
function safeUrl(url) {
  try {
    const u = new URL(url);
    return ["https:", "http:"].includes(u.protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}
function Projects() {
  const { data, open, put } = useApp();
  const [status, setStatus] = useState("All projects");
  const projects = data.projects.filter(
    (p) => status === "All projects" || p.status === status,
  );
  return (
    <>
      <PageHeader
        title="Projects"
        description="Build something you’re proud of. One commit at a time."
        action={
          <Button onClick={() => open("projects")}>
            <Plus size={17} />
            New project
          </Button>
        }
      />
      <div className="tabs project-tabs">
        {[
          "All projects",
          "Planning",
          "In Progress",
          "On Hold",
          "Completed",
        ].map((s) => (
          <button
            key={s}
            className={status === s ? "active" : ""}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((p) => (
            <article className="project-card" key={p.id}>
              <div className="card-title">
                <span className="project-symbol">
                  <Code2 size={24} />
                </span>
                <Badge color={p.status === "Completed" ? "low" : "purple"}>
                  {p.status}
                </Badge>
                <button
                  className="icon-button"
                  aria-label="Edit project"
                  onClick={() => open("projects", p)}
                >
                  <Pencil size={16} />
                </button>
                <DeleteItem collection="projects" id={p.id} />
              </div>
              <h2>{p.title}</h2>
              <p>{p.description}</p>
              <div className="stack-tags">
                {p.stack
                  .split(",")
                  .filter(Boolean)
                  .map((s, i) => (
                    <Badge key={i}>{s.trim()}</Badge>
                  ))}
              </div>
              <div className="progress-label">
                <span>Progress</span>
                <b>{p.progress}%</b>
              </div>
              <Progress value={p.progress} />
              <div className="project-dates">
                <span>Started {nice(p.start)}</span>
                <span>Target {nice(p.date)}</span>
              </div>
              <div className="checklist">
                {p.checklist.map((t) => (
                  <label key={t.id}>
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() =>
                        put("projects", {
                          ...p,
                          checklist: p.checklist.map((x) =>
                            x.id === t.id ? { ...x, done: !x.done } : x,
                          ),
                        })
                      }
                    />
                    {t.title}
                  </label>
                ))}
              </div>
              {p.notes && <p className="project-notes">{p.notes}</p>}
              <div className="project-links">
                {safeUrl(p.github) && (
                  <a href={safeUrl(p.github)} target="_blank" rel="noreferrer">
                    <Code2 size={15} />
                    Repository
                    <ArrowUpRight size={13} />
                  </a>
                )}
                {safeUrl(p.demo) && (
                  <a href={safeUrl(p.demo)} target="_blank" rel="noreferrer">
                    Live demo
                    <ArrowUpRight size={13} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Panel>
          <Empty
            icon={FolderKanban}
            title="Make your next idea real"
            text="Plan a project, track your work, and keep everything in one place."
            action={
              <Button onClick={() => open("projects")}>Create a project</Button>
            }
          />
        </Panel>
      )}
    </>
  );
}
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function SettingsPage() {
  const { data, setData, update, confirm, notify } = useApp();
  const s = data.settings;
  const change = (key, value) =>
    update("settings", (old) => ({ ...old, [key]: value }));
  const personalKeys = [
    "name",
    "avatar",
    "dateFormat",
    "weekStart",
    "currency",
  ];
  const personalValues = () =>
    Object.fromEntries(personalKeys.map((key) => [key, s[key]]));
  const [profile, setProfile] = useState(personalValues);
  useEffect(
    () => setProfile(personalValues()),
    [s.name, s.avatar, s.dateFormat, s.weekStart, s.currency],
  );
  const editProfile = (key, value) =>
    setProfile((old) => ({ ...old, [key]: value }));
  const profileDirty = personalKeys.some((key) => profile[key] !== s[key]);
  const saveProfile = () => {
    const saved = { ...profile, name: profile.name.trim() };
    setProfile(saved);
    update("settings", (old) => ({ ...old, ...saved }));
    notify("Personalization saved on this device.");
  };
  const fileRef = useRef();
  const importFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      if (f.size > 10 * 1024 * 1024)
        throw Error("Backup is larger than 10 MB.");
      const imported = repository.import(await f.text());
      confirm(
        "Replace all current data with this backup? Export your current workspace first if you want to keep it.",
        () => {
          setData(imported);
          notify("Workspace imported successfully.");
        },
      );
    } catch (err) {
      notify(err.message);
    }
    e.target.value = "";
  };
  return (
    <>
      <PageHeader
        title="Settings"
        description="Make this little corner of the internet yours."
      />
      <div className="settings-layout">
        <Panel
          title="Personalization"
          subtitle="The details that make it feel like you."
        >
          <div className="settings-body">
            <div className="profile-settings">
              <span className="avatar">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Profile preview" />
                ) : (
                  (profile.name || "You")
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                )}
              </span>
              <div>
                <strong>{profile.name || "Your personal workspace"}</strong>
                <small>Everything starts with you.</small>
              </div>
            </div>
            <label>
              Display name
              <input
                value={profile.name}
                maxLength={80}
                placeholder="What should we call you?"
                onChange={(e) => editProfile("name", e.target.value)}
              />
            </label>
            <label>
              Profile picture
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (!f) return;
                  if (f.size > 500000) {
                    notify("Choose an image smaller than 500 KB.");
                    return;
                  }
                  if (
                    !["image/png", "image/jpeg", "image/webp"].includes(f.type)
                  ) {
                    notify("Use a PNG, JPEG, or WebP image.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => editProfile("avatar", reader.result);
                  reader.readAsDataURL(f);
                }}
              />
            </label>
            {profile.avatar && (
              <button
                className="text-link"
                onClick={() => editProfile("avatar", "")}
              >
                Use initials instead
              </button>
            )}
            <div className="form-grid">
              <label>
                Date format
                <select
                  value={profile.dateFormat}
                  onChange={(e) => editProfile("dateFormat", e.target.value)}
                >
                  <option value="medium">Oct 24, 2026</option>
                  <option value="iso">2026-10-24</option>
                  <option value="long">October 24, 2026</option>
                </select>
              </label>
              <label>
                Week starts on
                <select
                  value={profile.weekStart}
                  onChange={(e) =>
                    editProfile("weekStart", Number(e.target.value))
                  }
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                </select>
              </label>
            </div>
            <label>
              Default currency
              <select
                value={profile.currency}
                onChange={(e) => editProfile("currency", e.target.value)}
              >
                {["PHP", "USD", "EUR", "GBP", "JPY", "SGD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <div className="personalization-save">
              <span className="muted" role="status">
                {profileDirty
                  ? "You have unsaved changes."
                  : "Your personalization is saved on this device."}
              </span>
              <div>
                {profileDirty && (
                  <Button
                    secondary
                    onClick={() => setProfile(personalValues())}
                  >
                    Cancel
                  </Button>
                )}
                <Button onClick={saveProfile} disabled={!profileDirty}>
                  <Check size={16} />
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        </Panel>
        <div>
          <Panel title="Appearance" subtitle="Your workspace, your way.">
            <div className="settings-body">
              <div className="theme-options">
                {[
                  ["dark", "Dark", Moon],
                  ["light", "Light", Sun],
                ].map(([key, label, Icon]) => (
                  <button
                    className={s.theme === key ? "selected" : ""}
                    onClick={() => change("theme", key)}
                    key={key}
                  >
                    <div className={`theme-preview ${key}`}>
                      <span />
                      <i />
                      <i />
                      <i />
                    </div>
                    <span>
                      <Icon size={16} />
                      {label}
                      {s.theme === key && <Check size={15} />}
                    </span>
                  </button>
                ))}
              </div>
              <label>
                Accent color
                <div className="accent-options">
                  {colors.map((c) => (
                    <button
                      key={c}
                      aria-label={`Use ${c} accent`}
                      style={{ background: c }}
                      onClick={() => change("accent", c)}
                    >
                      {s.accent === c && <Check size={16} />}
                    </button>
                  ))}
                  <input
                    aria-label="Custom accent color"
                    type="color"
                    value={s.accent}
                    onChange={(e) => change("accent", e.target.value)}
                  />
                </div>
              </label>
            </div>
          </Panel>
          <Panel
            className="mt"
            title="Your data"
            subtitle="Local, personal, and always yours."
          >
            <div className="settings-body">
              <div className="data-action">
                <div>
                  <strong>Export workspace</strong>
                  <p>Download a JSON backup of all your data.</p>
                </div>
                <Button
                  secondary
                  onClick={() =>
                    download(
                      new Blob([repository.export(data)], {
                        type: "application/json",
                      }),
                      `lifeos-${dateKey()}.json`,
                    )
                  }
                >
                  <Download size={16} />
                  Export
                </Button>
              </div>
              <div className="data-action">
                <div>
                  <strong>Import a backup</strong>
                  <p>Restore a previously exported workspace.</p>
                </div>
                <Button secondary onClick={() => fileRef.current.click()}>
                  <Upload size={16} />
                  Import
                </Button>
                <input
                  hidden
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={importFile}
                />
              </div>
              <div className="data-action danger-zone">
                <div>
                  <strong>Reset workspace</strong>
                  <p>Permanently remove all your local data.</p>
                </div>
                <button
                  className="button danger-button"
                  onClick={() =>
                    confirm(
                      "Permanently delete all tasks, notes, goals, habits, transactions, projects, and settings on this device?",
                      () => {
                        setData(initialData());
                        notify("Workspace reset. Here’s to a fresh start.");
                      },
                    )
                  }
                >
                  <Trash2 size={16} />
                  Reset
                </button>
              </div>
            </div>
          </Panel>
          <Offline />
        </div>
      </div>
    </>
  );
}
function Modal({ title, close, children, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const el = ref.current;
    const focusable = () =>
      [...el.querySelectorAll("button,input,select,textarea,a[href]")].filter(
        (e) => !e.disabled && !e.hidden,
      );
    focusable()[1]?.focus();
    const handler = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <motion.section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
        initial={{ y: 20, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.section>
    </motion.div>
  );
}
function Editor({ kind, item, extra, close }) {
  const { data, put, update, remove, confirm, notify } = useApp();
  const today = dateKey();
  const defaults = {
    tasks: {
      title: "",
      date: extra.date || today,
      time: "",
      priority: "Medium",
      category: extra.category || data.categories[0] || "Personal",
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    },
    events: {
      title: "",
      description: "",
      start: `${extra.date || today}T09:00`,
      end: `${extra.date || today}T10:00`,
      category: "Personal",
      color: colors[0],
    },
    diary: {
      title: "",
      date: extra.date || today,
      content: "",
      mood: "Okay",
      updatedAt: new Date().toISOString(),
    },
    notes: {
      title: "Untitled note",
      content: "",
      category: "Personal",
      tags: "",
      pinned: false,
      updatedAt: new Date().toISOString(),
    },
    goals: {
      title: "",
      description: "",
      date: "",
      progress: 0,
      milestones: [],
      kind: extra.kind || "personal",
    },
    habits: { title: "", dates: [] },
    transactions: {
      title: "",
      description: "",
      type: "expense",
      amount: "",
      date: today,
      category: "Food",
    },
    projects: {
      title: "",
      description: "",
      stack: "",
      status: "Planning",
      start: today,
      date: "",
      progress: 0,
      github: "",
      demo: "",
      notes: "",
      checklist: [],
    },
    category: { title: "" },
  };
  const [form, setForm] = useState(() => ({
    ...defaults[kind],
    ...item,
    id: item?.id || uid(),
  }));
  const [error, setError] = useState("");
  const [milestone, setMilestone] = useState("");
  const [preview, setPreview] = useState(false);
  const [noteDirty, setNoteDirty] = useState(false);
  const noteValid = useRef(false);
  const latest = useRef(form);
  latest.current = form;
  const change = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (kind === "notes" || kind === "diary") {
      setNoteDirty(true);
      noteValid.current = true;
    }
  };
  useEffect(() => {
    if (
      (kind === "notes" || kind === "diary") &&
      noteDirty &&
      form.date !== ""
    ) {
      const timer = setTimeout(() => {
        put(kind, {
          ...form,
          title:
            form.title.trim() ||
            (kind === "diary" ? "A moment from today" : "Untitled note"),
          updatedAt: new Date().toISOString(),
        });
        setNoteDirty(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [form, noteDirty]);
  useEffect(
    () => () => {
      if (
        (kind === "notes" || kind === "diary") &&
        noteValid.current &&
        latest.current.date !== ""
      ) {
        const f = latest.current;
        put(kind, {
          ...f,
          title:
            f.title.trim() ||
            (kind === "diary" ? "A moment from today" : "Untitled note"),
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [],
  );
  const closeEditor = () => {
    if (
      (kind === "notes" || kind === "diary") &&
      noteValid.current &&
      latest.current.date !== ""
    ) {
      const f = latest.current;
      put(kind, {
        ...f,
        title:
          f.title.trim() ||
          (kind === "diary" ? "A moment from today" : "Untitled note"),
        updatedAt: new Date().toISOString(),
      });
      noteValid.current = false;
    }
    close();
  };
  const field = (label, key, type = "text", props = {}) => (
    <label>
      {label}
      <input
        type={type}
        value={form[key]}
        onChange={(e) =>
          change(key, type === "number" ? e.target.value : e.target.value)
        }
        {...props}
      />
    </label>
  );
  const area = (label, key, rows = 3) => (
    <label>
      {label}
      <textarea
        rows={rows}
        value={form[key]}
        onChange={(e) => change(key, e.target.value)}
      />
    </label>
  );
  const select = (label, key, values) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={form[key]}
        onChange={(e) => change(key, e.target.value)}
      >
        {[...new Set([form[key], ...values])].filter(Boolean).map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
  const checklist = (key) => (
    <div className="editor-checklist">
      <label>{key === "milestones" ? "Milestones" : "Task checklist"}</label>
      {form[key].map((m) => (
        <div key={m.id}>
          <input
            type="checkbox"
            aria-label={`Complete ${m.title}`}
            checked={m.done}
            onChange={() =>
              change(
                key,
                form[key].map((x) =>
                  x.id === m.id ? { ...x, done: !x.done } : x,
                ),
              )
            }
          />
          <span>{m.title}</span>
          <button
            type="button"
            className="icon-button"
            aria-label={`Remove ${m.title}`}
            onClick={() =>
              change(
                key,
                form[key].filter((x) => x.id !== m.id),
              )
            }
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <div>
        <input
          aria-label={`New ${key === "milestones" ? "milestone" : "checklist task"}`}
          value={milestone}
          onChange={(e) => setMilestone(e.target.value)}
          placeholder="Add a small step…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (milestone.trim()) {
                change(key, [
                  ...form[key],
                  { id: uid(), title: milestone.trim(), done: false },
                ]);
                setMilestone("");
              }
            }
          }}
        />
        <Button
          type="button"
          secondary
          onClick={() => {
            if (milestone.trim()) {
              change(key, [
                ...form[key],
                { id: uid(), title: milestone.trim(), done: false },
              ]);
              setMilestone("");
            }
          }}
        >
          <Plus size={16} />
        </Button>
      </div>
    </div>
  );
  const save = (e) => {
    e.preventDefault();
    setError("");
    try {
      if (!form.title.trim()) throw Error("Please add a title.");
      let value = { ...form, title: form.title.trim() };
      if (kind === "events" && form.end < form.start)
        throw Error("End time must be after the start time.");
      if (kind === "transactions") {
        if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0)
          throw Error("Enter an amount greater than zero.");
        value.amount = Number(form.amount);
      }
      if (kind === "goals" || kind === "projects")
        value.progress = Number(form.progress);
      if (
        kind === "projects" &&
        form.start &&
        form.date &&
        form.date < form.start
      )
        throw Error("Target date must follow the start date.");
      if (kind === "notes" || kind === "diary")
        value.updatedAt = new Date().toISOString();
      if (kind === "category") {
        if (
          data.categories.some(
            (c) => c.toLowerCase() === value.title.toLowerCase(),
          )
        )
          throw Error("This category already exists.");
        if (value.title.toLowerCase() === "all")
          throw Error(
            "All is reserved for viewing every category. Choose another name.",
          );
        update("categories", (c) => [...c, value.title]);
        extra.onCreated?.(value.title);
      } else put(kind, value);
      notify(
        kind === "category" ? "Category created." : "Saved to your workspace.",
      );
      close();
    } catch (err) {
      setError(err.message);
    }
  };
  const names = {
    tasks: "task",
    events: "event",
    notes: "note",
    diary: "diary entry",
    goals: "goal",
    habits: "habit",
    transactions: "transaction",
    projects: "project",
    category: "category",
  };
  return (
    <Modal
      wide={kind === "notes" || kind === "diary" || kind === "projects"}
      title={`${item ? "Edit" : "New"} ${names[kind]}`}
      close={closeEditor}
    >
      <form onSubmit={save} className="editor-form">
        {field(kind === "habits" ? "Habit name" : "Title", "title", "text", {
          required: true,
          maxLength: 180,
        })}
        {kind === "tasks" && (
          <>
            <div className="form-grid">
              {field("Due date", "date", "date")}
              {field("Time (optional)", "time", "time")}
            </div>
            <div className="form-grid">
              {select("Priority", "priority", ["Low", "Medium", "High"])}
              {select("Category", "category", data.categories)}
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.completed}
                onChange={(e) => {
                  change("completed", e.target.checked);
                  change(
                    "completedAt",
                    e.target.checked ? new Date().toISOString() : null,
                  );
                }}
              />
              Completed
            </label>
          </>
        )}
        {kind === "events" && (
          <>
            {area("Description", "description")}
            <div className="form-grid">
              {field("Starts", "start", "datetime-local", { required: true })}
              {field("Ends", "end", "datetime-local", { required: true })}
            </div>
            <div className="form-grid">
              {select("Category", "category", data.categories)}
              {field("Event color", "color", "color")}
            </div>
          </>
        )}
        {(kind === "notes" || kind === "diary") && (
          <>
            {kind === "diary" ? (
              <div className="form-grid">
                {field("Entry date", "date", "date", { required: true })}
                {select("How are you feeling?", "mood", [
                  "Great",
                  "Good",
                  "Okay",
                  "Low",
                  "Difficult",
                ])}
              </div>
            ) : (
              <div className="form-grid">
                {select("Category", "category", data.categories)}
                {field("Tags (comma separated)", "tags")}
              </div>
            )}
            <div className="note-editor-toolbar">
              <div className="segmented">
                <button
                  type="button"
                  className={!preview ? "active" : ""}
                  onClick={() => setPreview(false)}
                >
                  Write
                </button>
                <button
                  type="button"
                  className={preview ? "active" : ""}
                  onClick={() => setPreview(true)}
                >
                  Preview
                </button>
              </div>
              <small>
                {noteDirty ? "Saving…" : "Changes save automatically"} ·
                Markdown supported
              </small>
            </div>
            {preview ? (
              <div className="markdown-preview">
                <Markdown>
                  {form.content || "*Your preview will appear here.*"}
                </Markdown>
              </div>
            ) : (
              <textarea
                className="note-editor"
                aria-label={kind === "diary" ? "Diary content" : "Note content"}
                value={form.content}
                onChange={(e) => change("content", e.target.value)}
                placeholder={
                  "# A little space to think\n\nWrite something worth remembering…"
                }
              />
            )}
            {kind === "notes" && (
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => change("pinned", e.target.checked)}
                />
                Pin this note
              </label>
            )}
          </>
        )}
        {kind === "goals" && (
          <>
            {area("Description", "description")}
            <div className="form-grid">
              {field("Target date", "date", "date")}
              {select("Goal type", "kind", ["personal", "savings"])}
            </div>
            <label>
              Progress: {form.progress}%
              <input
                type="range"
                min="0"
                max="100"
                value={form.progress}
                onChange={(e) => change("progress", Number(e.target.value))}
              />
            </label>
            {checklist("milestones")}
            <Button
              type="button"
              secondary
              onClick={() => change("progress", 100)}
            >
              <Check size={15} />
              Mark completed
            </Button>
          </>
        )}
        {kind === "habits" && (
          <p className="muted">
            Check in each day on Goals & Habits. Streaks are calculated from
            your recorded completion dates.
          </p>
        )}
        {kind === "transactions" && (
          <>
            <div className="form-grid">
              {select("Type", "type", ["expense", "income"])}
              {field(`Amount (${data.settings.currency})`, "amount", "number", {
                min: ".01",
                step: ".01",
                required: true,
              })}
            </div>
            <div className="form-grid">
              {field("Date", "date", "date", { required: true })}
              {select(
                "Category",
                "category",
                form.type === "income"
                  ? ["Salary", "Allowance", "Freelance", "Other"]
                  : [
                      "Food",
                      "Transportation",
                      "School",
                      "Shopping",
                      "Bills",
                      "Entertainment",
                      "Other",
                    ],
              )}
            </div>
            {area("Description (optional)", "description", 2)}
          </>
        )}
        {kind === "projects" && (
          <>
            {area("Description", "description")}
            {field("Technology stack (comma separated)", "stack")}
            <div className="form-grid">
              {select("Status", "status", [
                "Planning",
                "In Progress",
                "On Hold",
                "Completed",
              ])}
              <label>
                Progress: {form.progress}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.progress}
                  onChange={(e) => change("progress", Number(e.target.value))}
                />
              </label>
            </div>
            <div className="form-grid">
              {field("Start date", "start", "date")}
              {field("Target completion date", "date", "date")}
            </div>
            <div className="form-grid">
              {field("GitHub repository URL", "github", "url")}
              {field("Live demo URL", "demo", "url")}
            </div>
            {area("Project notes", "notes")}
            {checklist("checklist")}
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          {item && kind !== "notes" && (
            <button
              type="button"
              className="delete-link"
              onClick={() =>
                confirm(`Delete this ${names[kind]}?`, () => {
                  noteValid.current = false;
                  remove(kind, item.id);
                  close();
                })
              }
            >
              <Trash2 size={15} />
              Delete
            </button>
          )}
          <span />
          <Button type="button" secondary onClick={closeEditor}>
            {kind === "notes" || kind === "diary" ? "Close" : "Cancel"}
          </Button>
          <Button type="submit">
            <Check size={16} />
            {item ? "Save changes" : `Create ${names[kind]}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export default App;
