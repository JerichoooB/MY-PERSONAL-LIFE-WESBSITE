import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initialData, validateData } from "../src/data.js";
import {
  validateSchedule,
  previewSchedule,
  mergeSchedule,
  graphicsScheduleCorrection,
} from "../src/schedule.js";
const template = JSON.parse(
  readFileSync(
    new URL("../src/templates/second-year-schedule.json", import.meta.url),
  ),
);
const options = {
  start: "2026-10-26",
  end: "2026-11-01",
  choices: { cordillera: "A", pathfit: "morning" },
};
test("photo schedule expands to 17 weekly meetings with only the selected alternatives", () => {
  const p = previewSchedule(template, options);
  assert.equal(p.events.length, 17);
  assert.equal(p.classes.length, 10);
  assert.equal(p.conflicts.length, 0);
  assert.equal(p.events.filter((e) => e.title.startsWith("ITW 211")).length, 2);
  assert.ok(
    p.events.some(
      (e) =>
        e.start === "2026-10-27T08:30" &&
        e.end === "2026-10-27T10:00" &&
        e.title.startsWith("IAS"),
    ),
  );
  assert.ok(
    p.events.some(
      (e) => e.start === "2026-10-31T10:00" && e.end === "2026-10-31T13:00",
    ),
  );
  assert.ok(
    p.events.some(
      (e) => e.title.startsWith("PATHFIT") && e.start === "2026-10-31T08:00",
    ),
  );
  assert.ok(
    p.events.some(
      (e) =>
        e.title.includes("Heritage - A") && e.description.includes("Room: 501"),
    ),
  );
  assert.ok(!p.events.some((e) => e.title.includes("Heritage - B")));
  assert.ok(p.events.every((e) => e.category === "School"));
});
test("section B and afternoon PE import on Friday/Saturday without overlapping discrete math", () => {
  const p = previewSchedule(template, {
    ...options,
    choices: { cordillera: "B", pathfit: "afternoon" },
  });
  assert.equal(p.events.length, 17);
  assert.ok(
    p.events.some(
      (e) => e.title.startsWith("PATHFIT") && e.start === "2026-10-31T13:00",
    ),
  );
  assert.ok(
    p.events.some(
      (e) =>
        e.title.includes("Heritage - B") && e.description.includes("Room: TBA"),
    ),
  );
  assert.equal(p.conflicts.length, 0);
});
test("reimport is idempotent and preserves existing records, including edited imported events", () => {
  const added = previewSchedule(template, options).events;
  const personal = {
    id: "personal",
    title: "My event",
    start: "2026-10-26T09:00",
    end: "2026-10-26T10:00",
  };
  const before = [personal, ...added];
  const merged = mergeSchedule(before, added);
  assert.deepEqual(merged, before);
  assert.equal(previewSchedule(template, options, before).events.length, 0);
  assert.equal(previewSchedule(template, options, before).skipped, 17);
  const edited = added.map((e, i) =>
    i ? e : { ...e, title: "My customized title" },
  );
  assert.equal(previewSchedule(template, options, edited).events.length, 0);
  const d = initialData();
  d.events = added;
  assert.doesNotThrow(() => validateData(d));
});
test("date range includes boundaries, holidays are excluded, and conflicts are reported", () => {
  assert.equal(
    previewSchedule(template, {
      ...options,
      start: "2026-10-31",
      end: "2026-10-31",
    }).events.length,
    2,
  );
  assert.equal(
    previewSchedule(template, { ...options, exclude: ["2026-10-27"] }).events
      .length,
    13,
  );
  const conflict = {
    id: "x",
    title: "Study group",
    start: "2026-10-26T13:00",
    end: "2026-10-26T14:00",
  };
  const p = previewSchedule(template, options, [conflict]);
  assert.equal(p.conflicts.length, 1);
  assert.equal(p.conflicts[0].other, "Study group");
});
test("invalid templates, missing choices, dates, and oversized ranges fail before import", () => {
  for (const o of [
    { ...options, choices: {} },
    { ...options, end: "2026-10-01" },
    { ...options, start: "2026-02-30" },
    { ...options, end: "2028-01-01" },
    { ...options, exclude: ["not-a-date"] },
  ])
    assert.throws(() => previewSchedule(template, o));
  for (const edit of [
    (t) => (t.version = 4),
    (t) => (t.classes[0].end = "25:00"),
    (t) => (t.classes[0].days = [7]),
    (t) => (t.classes[0].end = "15:00"),
    (t) => t.classes.push({ ...t.classes[0] }),
    (t) => t.groups[0].options.push({ ...t.groups[0].options[0] }),
  ]) {
    const value = structuredClone(template);
    edit(value);
    assert.throws(() => validateSchedule(value));
  }
});

const legacyTemplate = () => {
  const old = structuredClone(template);
  old.classes = old.classes.filter((c) => c.id !== "itw213-tuesday");
  const g = old.classes.find((c) => c.id === "itw213");
  g.days = [2, 4];
  g.end = "14:30";
  return old;
};
test("new imports keep Tuesday 1–2:30 and move Thursday to Monday 1–2", () => {
  const p = previewSchedule(template, options);
  const g = p.events.filter((e) => e.title.startsWith("ITW 213"));
  assert.equal(g.length, 2);
  assert.ok(
    g.some(
      (e) => e.start === "2026-10-26T13:00" && e.end === "2026-10-26T14:00",
    ),
  );
  assert.ok(
    g.some(
      (e) => e.start === "2026-10-27T13:00" && e.end === "2026-10-27T14:30",
    ),
  );
  assert.equal(graphicsScheduleCorrection(p.events), null);
});
test("legacy correction removes Thursdays, preserves Tuesdays and other events, and is idempotent", () => {
  const before = previewSchedule(legacyTemplate(), {
    ...options,
    end: "2026-11-08",
  }).events;
  const tuesdays = before.filter(
    (e) => e.title.startsWith("ITW 213") && e.start.includes("2026-10-27"),
  );
  const unrelated = {
    id: "manual",
    title: "Lunch",
    start: "2026-10-26T13:30",
    end: "2026-10-26T14:00",
  };
  const p = graphicsScheduleCorrection([...before, unrelated]);
  assert.equal(p.removed, 2);
  assert.equal(p.addedMonday, 2);
  assert.equal(p.addedTuesday, 0);
  assert.equal(p.conflicts.length, 1);
  assert.ok(p.events.includes(unrelated));
  assert.ok(tuesdays.every((e) => p.events.includes(e)));
  assert.equal(p.events.filter((e) => e.title.startsWith("ITW 213")).length, 4);
  assert.equal(graphicsScheduleCorrection(p.events), null);
});
test("earlier Monday-only correction is repaired by restoring Tuesday once", () => {
  const old = structuredClone(template);
  old.classes = old.classes.filter((c) => c.id !== "itw213-tuesday");
  const before = previewSchedule(old, options).events;
  const monday = before.find((e) => e.id.includes(":itw213:"));
  const p = graphicsScheduleCorrection(before);
  assert.equal(p.removed, 0);
  assert.equal(p.addedMonday, 0);
  assert.equal(p.addedTuesday, 1);
  assert.ok(p.events.includes(monday));
  assert.equal(graphicsScheduleCorrection(p.events), null);
});
test("correction respects excluded Mondays/Tuesdays and customized imported slots", () => {
  const before = previewSchedule(legacyTemplate(), {
    ...options,
    end: "2026-11-08",
    exclude: ["2026-11-02"],
  }).events;
  const p = graphicsScheduleCorrection(before);
  assert.equal(p.removed, 2);
  assert.equal(p.addedMonday, 1);
  assert.ok(!p.events.some((e) => e.id.includes(":itw213:2026-11-02")));
  const onlyTuesday = {
    id: "schedule:second-year-schedule:itw213:2026-10-27",
    title: "ITW 213 · Graphics Designing (Photoshop)",
    start: "2026-10-27T13:00",
    end: "2026-10-27T14:30",
  };
  assert.equal(graphicsScheduleCorrection([onlyTuesday]), null);
  assert.equal(
    graphicsScheduleCorrection([{ ...onlyTuesday, title: "Custom class" }]),
    null,
  );
});
