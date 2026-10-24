import test from "node:test";
import assert from "node:assert/strict";
import {
  formatTime,
  formatDateTime,
  to12Hour,
  from12Hour,
} from "../src/time.js";
test("12-hour display distinguishes midnight/noon and handles event/task times", () => {
  for (const [value, expected] of [
    ["00:00", "12:00 AM"],
    ["12:00", "12:00 PM"],
    ["01:05", "1:05 AM"],
    ["13:00", "1:00 PM"],
    ["23:59", "11:59 PM"],
    ["2026-10-26T14:30", "2:30 PM"],
  ])
    assert.equal(formatTime(value), expected);
  assert.equal(formatTime(""), "");
  assert.equal(formatTime("25:00"), "");
  assert.match(formatDateTime("2026-10-26T13:00"), /Oct 26, 2026 at 1:00 PM/);
});
test("AM/PM controls preserve 24-hour storage for sorting and date math", () => {
  for (let h = 0; h < 24; h++) {
    const time = `${String(h).padStart(2, "0")}:35`;
    assert.equal(from12Hour(to12Hour(time)), time);
  }
  assert.equal(from12Hour({ hour: "12", minute: "00", period: "AM" }), "00:00");
  assert.equal(from12Hour({ hour: "12", minute: "00", period: "PM" }), "12:00");
  assert.equal(from12Hour({ hour: "", minute: "00", period: "AM" }), "");
  assert.equal(from12Hour({ hour: "3", minute: "99", period: "PM" }), "");
});
