const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
(async () => {
  const { initialData } = await import("../src/data.js");
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "Asia/Manila",
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date("2026-10-25T04:00:00Z"));
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.LIFEOS_BASE_URL || "http://localhost:4173/";
  const go = async (route) => {
    await page.goto(base + "#" + route);
    await page.locator("main h1").waitFor();
  };
  const stored = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("lifeos.v1")));
  await go("/");
  const seed = initialData();
  seed.habits = [{ id: "h", title: "Read daily", dates: [] }];
  seed.goals = [
    {
      id: "g",
      title: "Finish portfolio",
      description: "Build something",
      date: "",
      progress: 10,
      milestones: [{ id: "m", title: "First draft", done: false }],
      kind: "personal",
    },
  ];
  seed.projects = [
    {
      id: "p",
      title: "Portfolio site",
      description: "Build",
      stack: "React",
      status: "In Progress",
      start: "",
      date: "",
      progress: 10,
      github: "",
      demo: "",
      notes: "",
      checklist: [{ id: "c", title: "Finish homepage", done: false }],
    },
  ];
  await page.evaluate(
    (d) => localStorage.setItem("lifeos.v1", JSON.stringify(d)),
    seed,
  );
  await page.reload();
  await go("/goals");
  await page
    .getByRole("button", { name: "Check in today", exact: true })
    .click();
  let checked = page.getByRole("button", {
    name: "Checked today",
    exact: true,
  });
  await checked.waitFor();
  assert.equal(await checked.isDisabled(), true);
  assert.equal(await checked.getAttribute("aria-pressed"), "true");
  assert.deepEqual((await stored()).habits[0].dates, ["2026-10-25"]);
  await checked.evaluate((el) => el.click());
  assert.deepEqual((await stored()).habits[0].dates, ["2026-10-25"]);
  await page.reload();
  await checked.waitFor();
  await page
    .getByRole("button", { name: "Undo check-in", exact: true })
    .click();
  assert.deepEqual((await stored()).habits[0].dates, []);
  await page
    .getByRole("button", { name: "Check in today", exact: true })
    .click();
  await page.clock.setFixedTime(new Date("2026-10-26T04:00:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page
    .getByRole("button", { name: "Check in today", exact: true })
    .click();
  assert.deepEqual((await stored()).habits[0].dates, [
    "2026-10-25",
    "2026-10-26",
  ]);
  console.log(
    "PASS habit check-in: stays checked, saved once, survives reload, explicit Undo, next-day reset with history preserved.",
  );
  const goal = page.locator(".goal-card");
  await goal.getByRole("slider").fill("35");
  await goal.getByLabel("First draft", { exact: true }).check();
  assert.equal((await stored()).goals[0].progress, 10);
  assert.equal((await stored()).goals[0].milestones[0].done, false);
  await goal
    .getByRole("button", {
      name: "Save progress for Finish portfolio",
      exact: true,
    })
    .click();
  assert.equal((await stored()).goals[0].progress, 35);
  assert.equal((await stored()).goals[0].milestones[0].done, true);
  await goal.getByRole("slider").fill("55");
  await goal.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await goal.getByRole("slider").inputValue(), "35");
  await page.reload();
  assert.equal(await goal.getByRole("slider").inputValue(), "35");
  await go("/projects");
  const project = page.locator(".project-card");
  await project.getByLabel("Finish homepage", { exact: true }).check();
  assert.equal((await stored()).projects[0].checklist[0].done, false);
  await project
    .getByRole("button", {
      name: "Save checklist for Portfolio site",
      exact: true,
    })
    .click();
  assert.equal((await stored()).projects[0].checklist[0].done, true);
  await project.getByLabel("Finish homepage", { exact: true }).uncheck();
  await project.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(
    await project.getByLabel("Finish homepage", { exact: true }).isChecked(),
    true,
  );
  console.log(
    "PASS goals/milestones and project checklists: explicit save, cancel and persistence.",
  );
  await go("/finance");
  const budget = page.getByLabel("Monthly budget", { exact: true });
  await budget.fill("7500");
  assert.equal((await stored()).settings.budget, 5000);
  await page.getByRole("button", { name: "Save budget", exact: true }).click();
  assert.equal((await stored()).settings.budget, 7500);
  await page.reload();
  assert.equal(await budget.inputValue(), "7500");
  await budget.fill("");
  await page.getByRole("button", { name: "Save budget", exact: true }).click();
  assert.equal((await stored()).settings.budget, 7500);
  await budget.fill("0");
  await page.getByRole("button", { name: "Save budget", exact: true }).click();
  assert.equal((await stored()).settings.budget, 0);
  await page.reload();
  assert.equal(await budget.inputValue(), "0");
  await budget.focus();
  await page.keyboard.press("Backspace");
  assert.equal(await budget.inputValue(), "", "the saved zero can be erased");
  assert.equal(
    (await stored()).settings.budget,
    0,
    "blank draft must not change saved budget",
  );
  await budget.pressSequentially("2500.50");
  assert.equal(
    await budget.inputValue(),
    "2500.50",
    "typing does not retain a leading zero",
  );
  await page.getByRole("button", { name: "Save budget", exact: true }).click();
  assert.equal((await stored()).settings.budget, 2500.5);
  await budget.fill("0");
  await page.getByRole("button", { name: "Save budget", exact: true }).click();
  await budget.fill("100");
  await page.evaluate(() => {
    window.savedSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Save budget", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Could not save" })
    .waitFor();
  assert.equal((await stored()).settings.budget, 0);
  assert.equal(
    await page
      .getByRole("button", { name: "Save budget", exact: true })
      .isDisabled(),
    false,
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = window.savedSetItem;
  });
  await page.getByRole("button", { name: "Save budget", exact: true }).click();
  assert.equal((await stored()).settings.budget, 100);
  console.log(
    "PASS budget: explicit save, blank validation, zero budget, quota failure stays unsaved, retry succeeds.",
  );
  await go("/settings");
  await page.getByRole("button", { name: "Light", exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.equal((await stored()).settings.theme, "dark");
  await page
    .getByRole("button", { name: "Save appearance", exact: true })
    .click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  const appearance = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Appearance", exact: true }),
  });
  await appearance.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS appearance: explicit save/cancel, reload and mobile layout; no browser errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
