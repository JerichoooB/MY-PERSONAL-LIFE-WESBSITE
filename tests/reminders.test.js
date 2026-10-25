import test from "node:test";
import assert from "node:assert/strict";
import { initialData, validateData } from "../src/data.js";
import {
  dueReminders,
  reminderItems,
  exportReminderCalendar,
  DEFAULT_REMINDERS,
} from "../src/reminders.js";
const now = Date.parse("2026-10-26T04:00:00Z");
const fixture = () => {
  const d = initialData();
  d.settings.notifications = { ...DEFAULT_REMINDERS, enabled: true };
  d.events = [
    {
      id: "class",
      title: "ITW 213",
      description: "Room: LAN",
      category: "School",
      start: "2026-10-26T04:05:00Z",
      end: "2026-10-26T05:05:00Z",
    },
    {
      id: "event",
      title: "Meeting",
      description: "Work",
      category: "Personal",
      start: "2026-10-26T04:20:00Z",
      end: "2026-10-26T04:40:00Z",
    },
  ];
  d.tasks = [
    {
      id: "task",
      title: "Review",
      category: "School",
      date: "2026-10-26",
      time: "04:08",
      completed: false,
    },
    {
      id: "done",
      title: "Already done",
      date: "2026-10-26",
      time: "04:09",
      completed: true,
    },
    {
      id: "untimed",
      title: "Untimed",
      date: "2026-10-26",
      time: "",
      completed: false,
    },
  ];
  return d;
};
test("reminders respect lead times, type settings, completion and delivery history", () => {
  const d = fixture();
  assert.deepEqual(
    dueReminders(d, now).map((i) => i.kind),
    ["class", "task"],
  );
  const key = reminderItems(d)[0].key;
  assert.deepEqual(
    dueReminders(d, now, { [key]: now }).map((i) => i.kind),
    ["task"],
  );
  d.settings.notifications.classes = false;
  assert.deepEqual(
    dueReminders(d, now).map((i) => i.kind),
    ["task"],
  );
  d.settings.notifications.enabled = false;
  assert.equal(dueReminders(d, now).length, 0);
});
test("at-start reminders tolerate the polling delay but do not send stale reminders", () => {
  const d = fixture();
  d.settings.notifications.leadMinutes = 0;
  const start = Date.parse(d.events[0].start);
  assert.equal(
    dueReminders(d, start + 500).some((i) => i.id === "class"),
    true,
  );
  assert.equal(
    dueReminders(d, start + 61000).some((i) => i.id === "class"),
    false,
  );
});
test("older backups gain disabled defaults; invalid settings are rejected", () => {
  const old = initialData();
  delete old.settings.notifications;
  assert.deepEqual(validateData(old).settings.notifications, DEFAULT_REMINDERS);
  const bad = initialData();
  bad.settings.notifications.leadMinutes = -5;
  assert.throws(() => validateData(bad));
});
test("calendar export includes future items and UTC alarms with stable UIDs and safe escaped text", () => {
  const d = fixture();
  d.events[0].title = "Class, C#; \\ study\nBEGIN:VEVIL";
  d.events[0].description = "Notes: " + "日本語".repeat(50);
  const first = exportReminderCalendar(d, d.settings.notifications, now);
  const second = exportReminderCalendar(
    d,
    d.settings.notifications,
    now + 1000,
  );
  assert.equal(first.count, 3);
  assert.equal((first.content.match(/BEGIN:VALARM/g) || []).length, 3);
  assert.ok(first.content.includes("TRIGGER:-PT10M"));
  assert.ok(first.content.includes("DTSTART:20261026T040500Z"));
  assert.ok(first.content.includes("Class\\, C#\\; \\\\ study\\nBEGIN:VEVIL"));
  assert.ok(!first.content.includes("\r\nBEGIN:VEVIL"));
  assert.deepEqual(
    first.content.match(/UID:.*\r\n/g),
    second.content.match(/UID:.*\r\n/g),
  );
  for (const line of first.content.split("\r\n"))
    assert.ok(new TextEncoder().encode(line).length <= 75);
  d.settings.notifications.leadMinutes = 0;
  assert.ok(
    exportReminderCalendar(d, d.settings.notifications, now).content.includes(
      "TRIGGER:PT0M",
    ),
  );
});
