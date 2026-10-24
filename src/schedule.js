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
