import { addDays, dateKey } from "./data.js";
export const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const isDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  dateKey(new Date(`${value}T12:00:00`)) === value;
const isTime = (value) =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const isText = (v, max = 200) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
export function validateSchedule(template) {
  if (
    !template ||
    template.format !== "lifeos-weekly-schedule" ||
    template.version !== 1 ||
    !isText(template.id, 80) ||
    !isText(template.title) ||
    template.timezone !== "Asia/Manila"
  )
    throw Error(
      "Choose a LifeOS weekly schedule JSON file (version 1, Asia/Manila).",
    );
  if (
    !Array.isArray(template.groups) ||
    template.groups.length > 10 ||
    !Array.isArray(template.classes) ||
    !template.classes.length ||
    template.classes.length > 100
  )
    throw Error("The schedule needs 1–100 classes and valid choice groups.");
  const groupIds = new Set();
  for (const group of template.groups) {
    if (
      !group ||
      !isText(group.id, 80) ||
      groupIds.has(group.id) ||
      !isText(group.label) ||
      !Array.isArray(group.options) ||
      group.options.length < 2 ||
      group.options.length > 20 ||
      group.options.some((o) => !o || !isText(o.id, 80) || !isText(o.label)) ||
      new Set(group.options.map((o) => o.id)).size !== group.options.length
    )
      throw Error("The schedule has an invalid section/time choice.");
    groupIds.add(group.id);
  }
  const ids = new Set();
  for (const c of template.classes) {
    if (
      !c ||
      !isText(c.id, 80) ||
      ids.has(c.id) ||
      !isText(c.title) ||
      !isText(c.code, 80) ||
      !Array.isArray(c.days) ||
      !c.days.length ||
      c.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
      new Set(c.days).size !== c.days.length ||
      !isTime(c.start) ||
      !isTime(c.end) ||
      c.end <= c.start ||
      !isText(c.room, 80) ||
      !isText(c.instructor) ||
      typeof c.attendanceNote !== "string" ||
      c.attendanceNote.length > 500 ||
      !/^#[0-9a-f]{6}$/i.test(c.color)
    )
      throw Error("A class has invalid details, days, or times.");
    if (c.group || c.option) {
      const group = template.groups.find((g) => g.id === c.group);
      if (!group || !group.options.some((o) => o.id === c.option))
        throw Error("A class refers to an unknown section/time option.");
    }
    ids.add(c.id);
  }
  for (const group of template.groups)
    if (
      group.options.some(
        (o) =>
          !template.classes.some(
            (c) => c.group === group.id && c.option === o.id,
          ),
      )
    )
      throw Error("Every section/time option must have classes.");
  return template;
}
const eventKey = (e) => `${e.title.trim().toLowerCase()}|${e.start}|${e.end}`;
export function previewSchedule(
  template,
  { start, end, choices = {}, exclude = [] },
  existing = [],
) {
  validateSchedule(template);
  if (!isDate(start) || !isDate(end) || end < start)
    throw Error("Choose valid first and last class dates.");
  const span =
    Math.round(
      (Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) /
        86400000,
    ) + 1;
  if (span > 366) throw Error("Import up to one year at a time.");
  for (const g of template.groups)
    if (!g.options.some((o) => o.id === choices[g.id]))
      throw Error(`Choose your ${g.label.toLowerCase()}.`);
  if (!Array.isArray(exclude) || exclude.some((d) => !isDate(d)))
    throw Error("Excluded dates must use YYYY-MM-DD.");
  const selected = template.classes.filter(
    (c) => !c.group || choices[c.group] === c.option,
  );
  const ids = new Set(existing.map((e) => e.id));
  const keys = new Set(existing.map(eventKey));
  const excluded = new Set(exclude);
  const events = [];
  let skipped = 0;
  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (excluded.has(date)) continue;
    const day = new Date(`${date}T12:00:00`).getDay();
    for (const c of selected.filter((c) => c.days.includes(day))) {
      const event = {
        id: `schedule:${template.id}:${c.id}:${date}`,
        title: `${c.code} · ${c.title}`,
        description: `Room: ${c.room}\nInstructor: ${c.instructor}\n${c.attendanceNote}\nClass times: Philippine local time (Asia/Manila).\nImported from ${template.title}.`,
        category: "School",
        color: c.color,
        start: `${date}T${c.start}`,
        end: `${date}T${c.end}`,
      };
      if (ids.has(event.id) || keys.has(eventKey(event))) {
        skipped++;
        continue;
      }
      ids.add(event.id);
      keys.add(eventKey(event));
      events.push(event);
    }
  }
  events.sort(
    (a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title),
  );
  const conflicts = [];
  const all = [...existing, ...events];
  for (const event of events) {
    const overlap = all.find(
      (other) =>
        other.id !== event.id &&
        other.start < event.end &&
        other.end > event.start,
    );
    if (overlap)
      conflicts.push({
        title: event.title,
        start: event.start,
        other: overlap.title,
      });
  }
  return { events, skipped, conflicts, classes: selected };
}
export function mergeSchedule(existing, additions) {
  const ids = new Set(existing.map((e) => e.id));
  const keys = new Set(existing.map(eventKey));
  return [
    ...existing,
    ...additions.filter((e) => {
      if (ids.has(e.id) || keys.has(eventKey(e))) return false;
      ids.add(e.id);
      keys.add(eventKey(e));
      return true;
    }),
  ];
}

// Move Thursday only; retain Tuesday and repair the earlier Monday-only import.
export function graphicsScheduleCorrection(existing) {
  const prefix = "schedule:second-year-schedule:";
  const courseId = (e) =>
    e.id.startsWith(prefix + "itw213:") ||
    e.id.startsWith(prefix + "itw213-tuesday:");
  const weekday = (e) => new Date(`${e.start.slice(0, 10)}T12:00:00`).getDay();
  const title = "ITW 213 · Graphics Designing (Photoshop)";
  const course = existing.filter(
    (e) =>
      courseId(e) &&
      e.title === title &&
      e.start.slice(11) === "13:00" &&
      ((weekday(e) === 1 && e.end.slice(11) === "14:00") ||
        ([2, 4].includes(weekday(e)) && e.end.slice(11) === "14:30")),
  );
  if (!course.length) return null;
  const outdated = course.filter((e) => weekday(e) === 4);
  const removed = new Set(outdated.map((e) => e.id));
  const kept = existing.filter((e) => !removed.has(e.id));
  const dates = existing
    .filter((e) => e.id.startsWith(prefix))
    .map((e) => e.start.slice(0, 10))
    .sort();
  const importedDays = new Set(dates);
  const start = dates[0],
    end = dates.at(-1);
  const weeks = new Map();
  for (const e of course) {
    const day = e.start.slice(0, 10);
    const monday = addDays(day, -((weekday(e) + 6) % 7));
    if (!weeks.has(monday)) weeks.set(monday, e);
  }
  const additions = [];
  for (const [monday, event] of weeks) {
    for (const slot of [
      { date: monday, id: "itw213", end: "14:00" },
      { date: addDays(monday, 1), id: "itw213-tuesday", end: "14:30" },
    ]) {
      if (
        !importedDays.has(slot.date) ||
        kept.some((e) => courseId(e) && e.start.slice(0, 10) === slot.date)
      )
        continue;
      additions.push({
        ...event,
        id: `${prefix}${slot.id}:${slot.date}`,
        start: `${slot.date}T13:00`,
        end: `${slot.date}T${slot.end}`,
      });
    }
  }
  const events = mergeSchedule(kept, additions);
  const keptIds = new Set(kept.map((e) => e.id));
  const added = events.filter((e) => !keptIds.has(e.id));
  if (!outdated.length && !added.length) return null;
  const conflicts = added.flatMap((e) =>
    kept
      .filter((other) => other.start < e.end && other.end > e.start)
      .map((other) => ({ date: e.start.slice(0, 10), title: other.title })),
  );
  return {
    events,
    removed: outdated.length,
    added: added.length,
    addedMonday: added.filter((e) => weekday(e) === 1).length,
    addedTuesday: added.filter((e) => weekday(e) === 2).length,
    start,
    end,
    conflicts,
  };
}
