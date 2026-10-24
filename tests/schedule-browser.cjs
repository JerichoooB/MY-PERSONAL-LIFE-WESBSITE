const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const path = require("node:path");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.LIFEOS_BASE_URL || "http://localhost:4173/";
  await page.goto(base + "#/calendar");
  await page.locator("main h1").waitFor();
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("lifeos.v1"));
    d.events = [
      {
        id: "existing",
        title: "Study group",
        description: "Keep this",
        category: "Personal",
        color: "#df9383",
        start: "2026-10-26T13:00",
        end: "2026-10-26T14:00",
      },
    ];
    d.notes = [
      {
        id: "note",
        title: "Keep this note",
        content: "My existing data",
        category: "Personal",
        tags: "",
        pinned: false,
        updatedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem("lifeos.v1", JSON.stringify(d));
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Import schedule", exact: true })
    .click();
  const modal = page.getByRole("dialog", { name: "Import weekly schedule" });
  assert.equal(
    await modal
      .getByRole("button", { name: /Import .*class events/ })
      .isDisabled(),
    true,
  );
  await modal
    .getByLabel("First class date", { exact: true })
    .fill("2026-10-26");
  await modal.getByLabel("Last class date", { exact: true }).fill("2026-11-01");
  await modal
    .getByLabel("Cordillera section", { exact: true })
    .selectOption("A");
  await modal
    .getByLabel("PATHFIT 3 time", { exact: true })
    .selectOption("morning");
  await modal.getByText("class events to add", { exact: true }).waitFor();
  assert.equal(
    await modal
      .getByRole("button", { name: "Import 17 class events", exact: true })
      .isDisabled(),
    true,
  );
  await modal.getByLabel("Import despite these overlaps").check();
  await modal
    .getByRole("button", { name: "Import 17 class events", exact: true })
    .click();
  let data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lifeos.v1")),
  );
  assert.equal(data.events.length, 18);
  assert.equal(data.notes[0].content, "My existing data");
  assert.ok(data.events.some((e) => e.id === "existing"));
  await page.reload();
  await page
    .getByRole("button", { name: "Import schedule", exact: true })
    .click();
  await modal
    .locator("input[type=file]")
    .setInputFiles(path.resolve("src/templates/second-year-schedule.json"));
  await modal
    .getByLabel("First class date", { exact: true })
    .fill("2026-10-26");
  await modal.getByLabel("Last class date", { exact: true }).fill("2026-11-01");
  await modal
    .getByLabel("Cordillera section", { exact: true })
    .selectOption("A");
  await modal
    .getByLabel("PATHFIT 3 time", { exact: true })
    .selectOption("morning");
  await modal.getByText(/17 already imported, skipped/).waitFor();
  assert.equal(
    await modal
      .getByRole("button", { name: /Import .*class events/ })
      .isDisabled(),
    true,
  );
  await modal.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1}'),
  });
  await modal.getByRole("alert").waitFor();
  assert.equal(
    (await page.evaluate(() => JSON.parse(localStorage.getItem("lifeos.v1"))))
      .events.length,
    18,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  const { previewSchedule } = await import("../src/schedule.js");
  const legacy = JSON.parse(
    require("node:fs").readFileSync(
      path.resolve("src/templates/second-year-schedule.json"),
      "utf8",
    ),
  );
  legacy.classes = legacy.classes.filter((c) => c.id !== "itw213-tuesday");
  const graphics = legacy.classes.find((c) => c.id === "itw213");
  graphics.days = [2, 4];
  graphics.end = "14:30";
  const legacyEvents = previewSchedule(legacy, {
    start: "2026-10-26",
    end: "2026-11-01",
    choices: { cordillera: "A", pathfit: "morning" },
  }).events;
  await page.evaluate((events) => {
    const d = JSON.parse(localStorage.getItem("lifeos.v1"));
    d.events = [
      ...events,
      {
        id: "keep",
        title: "Keep my appointment",
        description: "",
        category: "Personal",
        color: "#df9383",
        start: "2026-10-28T09:00",
        end: "2026-10-28T10:00",
      },
    ];
    localStorage.setItem("lifeos.v1", JSON.stringify(d));
  }, legacyEvents);
  await page.reload();
  await page
    .getByRole("button", { name: "Apply class change", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await page.reload();
  const changed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lifeos.v1")),
  );
  assert.equal(
    changed.events.filter((e) => e.title.startsWith("ITW 213")).length,
    2,
  );
  assert.ok(
    changed.events.some(
      (e) =>
        e.id.includes(":itw213:") &&
        e.start === "2026-10-26T13:00" &&
        e.end === "2026-10-26T14:00",
    ),
  );
  assert.ok(
    changed.events.some(
      (e) =>
        e.title.startsWith("ITW 213") &&
        e.start === "2026-10-27T13:00" &&
        e.end === "2026-10-27T14:30",
    ),
  );
  assert.ok(
    !changed.events.some(
      (e) => e.title.startsWith("ITW 213") && e.start.startsWith("2026-10-29"),
    ),
  );
  assert.ok(changed.events.some((e) => e.id === "keep"));
  assert.equal(changed.notes[0].title, "Keep this note");
  assert.equal(
    await page
      .getByRole("button", { name: "Apply class change", exact: true })
      .count(),
    0,
  );
  console.log(
    "PASS existing schedule correction: Thursday removed, Tuesday retained, Monday 1–2 added once, other data preserved.",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS schedule import: mobile preview, explicit choices/range, conflict consent, additive persistence, JSON upload, duplicate skipping, invalid-file protection.",
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
