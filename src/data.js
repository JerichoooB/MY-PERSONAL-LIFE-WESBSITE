export const STORAGE_KEY = "lifeos.v1";
export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (key, n) => {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};
export const uid = () => globalThis.crypto.randomUUID();
export const initialData = () => ({
  version: 1,
  tasks: [],
  events: [],
  notes: [],
  diary: [],
  goals: [],
  habits: [],
  transactions: [],
  projects: [],
  categories: ["Work", "Health", "Family", "School", "Personal", "Important"],
  settings: {
    name: "",
    theme: "dark",
    accent: "#DF9383",
    currency: "PHP",
    budget: 5000,
    dateFormat: "medium",
    weekStart: 0,
    avatar: "",
  },
});
export function streaks(dates, today = dateKey()) {
  const set = new Set(dates);
  let current = 0,
    cursor = set.has(today) ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let longest = 0,
    run = 0,
    prev = null;
  [...set].sort().forEach((d) => {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  });
  return { current, longest };
}
export function validateData(d) {
  if (!d || d.version !== 1 || !d.settings || typeof d.settings !== "object")
    throw Error("This is not a LifeOS version 1 backup.");
  const strings = (o, keys) => keys.every((k) => typeof o[k] === "string");
  const number = (n, min = 0, max = Infinity) =>
    typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
  const day = (s) =>
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    dateKey(new Date(`${s}T12:00:00`)) === s;
  const optionalDay = (s) => s === "" || day(s);
  if (d.diary === undefined) d.diary = [];
  const checks = {
    diary: (o) =>
      strings(o, ["title", "content", "mood", "updatedAt"]) &&
      day(o.date) &&
      ["Great", "Good", "Okay", "Low", "Difficult"].includes(o.mood),
    tasks: (o) =>
      strings(o, ["title", "category", "createdAt", "time"]) &&
      optionalDay(o.date) &&
      ["Low", "Medium", "High"].includes(o.priority) &&
      typeof o.completed === "boolean" &&
      (o.completedAt === null || typeof o.completedAt === "string"),
    events: (o) =>
      strings(o, [
        "title",
        "description",
        "category",
        "color",
        "start",
        "end",
      ]) &&
      Number.isFinite(Date.parse(o.start)) &&
      Number.isFinite(Date.parse(o.end)) &&
      o.end >= o.start,
    notes: (o) =>
      strings(o, ["title", "content", "category", "tags", "updatedAt"]) &&
      typeof o.pinned === "boolean",
    goals: (o) =>
      strings(o, ["title", "description", "kind"]) &&
      optionalDay(o.date) &&
      number(o.progress, 0, 100) &&
      Array.isArray(o.milestones) &&
      o.milestones.every(
        (m) => m && strings(m, ["id", "title"]) && typeof m.done === "boolean",
      ),
    habits: (o) =>
      strings(o, ["title"]) && Array.isArray(o.dates) && o.dates.every(day),
    transactions: (o) =>
      strings(o, ["title", "category"]) &&
      day(o.date) &&
      number(o.amount, 0.01) &&
      ["income", "expense"].includes(o.type),
    projects: (o) =>
      strings(o, [
        "title",
        "description",
        "stack",
        "status",
        "github",
        "demo",
        "notes",
      ]) &&
      ["Planning", "In Progress", "On Hold", "Completed"].includes(o.status) &&
      optionalDay(o.start) &&
      optionalDay(o.date) &&
      number(o.progress, 0, 100) &&
      Array.isArray(o.checklist) &&
      o.checklist.every(
        (m) => m && strings(m, ["id", "title"]) && typeof m.done === "boolean",
      ),
  };
  for (const [key, check] of Object.entries(checks)) {
    if (
      !Array.isArray(d[key]) ||
      d[key].some((o) => !o || typeof o.id !== "string" || !check(o)) ||
      new Set(d[key].map((o) => o.id)).size !== d[key].length
    )
      throw Error(
        `Invalid ${key} in backup. Your current data has not been changed.`,
      );
  }
  if (
    !Array.isArray(d.categories) ||
    !d.categories.every((c) => typeof c === "string") ||
    !strings(d.settings, [
      "name",
      "accent",
      "currency",
      "dateFormat",
      "avatar",
    ]) ||
    !["dark", "light"].includes(d.settings.theme) ||
    !/^#[\da-f]{6}$/i.test(d.settings.accent) ||
    !["medium", "iso", "long"].includes(d.settings.dateFormat) ||
    ![0, 1].includes(d.settings.weekStart) ||
    !number(d.settings.budget)
  )
    throw Error("Invalid settings or categories.");
  try {
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: d.settings.currency,
    });
  } catch {
    throw Error("Invalid currency.");
  }
  return d;
}
export const repository = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? validateData(JSON.parse(raw)) : initialData();
    } catch (e) {
      return {
        ...initialData(),
        loadError: `Saved data could not be loaded: ${e.message} Export or recover it before saving new changes.`,
      };
    }
  },
  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  export(data) {
    return JSON.stringify(data, null, 2);
  },
  import(raw) {
    return validateData(JSON.parse(raw));
  },
};
