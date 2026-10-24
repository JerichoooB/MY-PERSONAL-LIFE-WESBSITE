const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const page = await b.newPage({
    viewport: { width: 390, height: 844 },
    locale: "en-GB",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.LIFEOS_BASE_URL || "http://localhost:4173/";
  await page.goto(base + "#/tasks");
  await page.getByRole("button", { name: "New task", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title", { exact: true }).fill("Clock check");
  await dialog
    .getByLabel("Time (optional) hour", { exact: true })
    .selectOption("12");
  await dialog
    .getByLabel("Time (optional) AM or PM", { exact: true })
    .selectOption("AM");
  await dialog
    .getByRole("button", { name: "Create task", exact: true })
    .click();
  await page.getByText("Work · 12:00 AM", { exact: true }).waitFor();
  let d = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lifeos.v1")),
  );
  assert.equal(d.tasks[0].time, "00:00");
  await page
    .getByRole("button", { name: "Edit Clock check", exact: true })
    .click();
  await dialog
    .getByLabel("Time (optional) hour", { exact: true })
    .selectOption("1");
  await dialog
    .getByLabel("Time (optional) minute", { exact: true })
    .selectOption("05");
  await dialog
    .getByLabel("Time (optional) AM or PM", { exact: true })
    .selectOption("PM");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await page.getByText("Work · 1:05 PM", { exact: true }).waitFor();
  await page.reload();
  await page.getByText("Work · 1:05 PM", { exact: true }).waitFor();
  d = await page.evaluate(() => JSON.parse(localStorage.getItem("lifeos.v1")));
  assert.equal(d.tasks[0].time, "13:05");
  await page.goto(base + "#/calendar");
  await page.getByRole("button", { name: "New event", exact: true }).click();
  await dialog.getByLabel("Title", { exact: true }).fill("Noon event");
  for (const label of ["Starts", "Ends"]) {
    await dialog
      .getByLabel(label + " date", { exact: true })
      .fill("2026-11-02");
    await dialog
      .getByLabel(label + " minute", { exact: true })
      .selectOption("00");
    await dialog
      .getByLabel(label + " AM or PM", { exact: true })
      .selectOption("PM");
  }
  await dialog.getByLabel("Starts hour", { exact: true }).selectOption("12");
  await dialog.getByLabel("Ends hour", { exact: true }).selectOption("1");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await dialog
    .getByRole("button", { name: "Create event", exact: true })
    .click();
  d = await page.evaluate(() => JSON.parse(localStorage.getItem("lifeos.v1")));
  assert.equal(d.events[0].start, "2026-11-02T12:00");
  assert.equal(d.events[0].end, "2026-11-02T13:00");
  await page.getByRole("button", { name: "Open global search" }).click();
  await page.getByLabel("Global search", { exact: true }).fill("Noon event");
  await page.getByLabel("Global search", { exact: true }).press("Enter");
  await page.getByRole("dialog", { name: "Edit event" }).waitFor();
  assert.equal(
    await dialog.getByLabel("Starts hour", { exact: true }).inputValue(),
    "12",
  );
  assert.equal(
    await dialog.getByLabel("Starts AM or PM", { exact: true }).inputValue(),
    "PM",
  );
  await dialog.getByLabel("Ends AM or PM", { exact: true }).selectOption("AM");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await dialog.getByRole("alert").filter({ hasText: "End time" }).waitFor();
  await dialog.getByLabel("Ends AM or PM", { exact: true }).selectOption("PM");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import schedule", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Import weekly schedule" });
  await dialog
    .getByLabel("First class date", { exact: true })
    .fill("2026-11-02");
  await dialog
    .getByLabel("Last class date", { exact: true })
    .fill("2026-11-08");
  await dialog
    .getByLabel("Cordillera section", { exact: true })
    .selectOption("A");
  await dialog
    .getByLabel("PATHFIT 3 time", { exact: true })
    .selectOption("morning");
  const text = await dialog.locator(".schedule-preview").innerText();
  assert.ok(text.includes("1:00 PM"));
  assert.ok(text.includes("2:30 PM"));
  assert.ok(!text.includes("13:00"));
  assert.ok(!text.includes("14:30"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS 12-hour controls/display in en-GB: midnight, noon, PM task persistence, event round-trip, end-time validation, mobile layout, and schedule preview.",
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
