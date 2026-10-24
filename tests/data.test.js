import test from "node:test";
import assert from "node:assert/strict";
import {
  initialData,
  validateData,
  streaks,
  addDays,
  dateKey,
  repository,
} from "../src/data.js";
test("workspace backup round-trip preserves all supported collections", () => {
  const d = initialData();
  d.tasks.push({
    id: "t",
    title: "Study",
    date: "2026-10-24",
    time: "12:00",
    priority: "High",
    category: "School",
    completed: true,
    completedAt: "2026-10-24T12:00:00Z",
    createdAt: "2026-10-24T10:00:00Z",
  });
  d.events.push({
    id: "e",
    title: "Lecture",
    description: "Study",
    category: "School",
    color: "#8b5cf6",
    start: "2026-10-24T09:00",
    end: "2026-10-24T10:00",
  });
  d.notes.push({
    id: "n",
    title: "Notes",
    content: "# Hello",
    tags: "school",
    category: "School",
    updatedAt: "2026-10-24T10:00:00Z",
    pinned: true,
  });
  d.goals.push({
    id: "g",
    title: "Save",
    description: "Buffer",
    date: "",
    progress: 20,
    kind: "savings",
    milestones: [{ id: "m", title: "Start", done: true }],
  });
  d.habits.push({ id: "h", title: "Read", dates: ["2026-10-24"] });
  d.transactions.push({
    id: "x",
    title: "Lunch",
    amount: 100,
    date: "2026-10-24",
    type: "expense",
    category: "Food",
  });
  d.projects.push({
    id: "p",
    title: "App",
    description: "Build",
    stack: "React",
    status: "In Progress",
    start: "2026-10-24",
    date: "",
    progress: 10,
    github: "",
    demo: "",
    notes: "",
    checklist: [],
  });
  assert.deepEqual(repository.import(repository.export(d)), d);
});
test("invalid backups fail before replacement", () => {
  for (const value of [
    null,
    {},
    { ...initialData(), tasks: [{ id: "x" }] },
    {
      ...initialData(),
      habits: [{ id: "h", title: "Read", dates: ["2026-02-30"] }],
    },
    {
      ...initialData(),
      transactions: [
        {
          id: "x",
          title: "Bad",
          category: "Food",
          date: "2026-10-24",
          type: "expense",
          amount: -5,
        },
      ],
    },
  ])
    assert.throws(() => validateData(value));
});
test("streaks use unique calendar dates and allow yesterday before check-in", () => {
  assert.deepEqual(
    streaks(
      ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-22"],
      "2026-10-23",
    ),
    { current: 3, longest: 3 },
  );
  assert.deepEqual(
    streaks(
      ["2026-10-20", "2026-10-21", "2026-10-23", "2026-10-24"],
      "2026-10-24",
    ),
    { current: 2, longest: 2 },
  );
  assert.deepEqual(streaks(["2026-10-20", "2026-10-21"], "2026-10-24"), {
    current: 0,
    longest: 2,
  });
  assert.deepEqual(streaks([], "2026-10-24"), { current: 0, longest: 0 });
});
test("calendar date arithmetic crosses months, years, and leap days", () => {
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2024-02-29", 1), "2024-03-01");
});

test("diary backups preserve moods and content; older workspaces migrate", () => {
  const d = initialData();
  d.diary.push({
    id: "d",
    title: "Today",
    content: "A thoughtful day.",
    date: "2026-10-24",
    mood: "Good",
    updatedAt: "2026-10-24T12:00:00Z",
  });
  assert.deepEqual(repository.import(repository.export(d)).diary, d.diary);
  const old = initialData();
  delete old.diary;
  assert.deepEqual(validateData(old).diary, []);
  d.diary[0].mood = "invalid";
  assert.throws(() => validateData(d));
});
