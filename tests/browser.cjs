const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const artifacts = fs.mkdtempSync("/tmp/lifeos-browser-");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Asia/Manila",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const go = async (path) => {
    console.log("PAGE", path);
    await page.goto(
      (process.env.LIFEOS_BASE_URL || "http://localhost:4173/") + "#" + path,
    );
    await page.locator("h1").waitFor();
  };
  const dialog = () => page.getByRole("dialog").last();
  const create = async (title, button, fill) => {
    console.log("CREATE", title);
    await page
      .getByRole("button", { name: button, exact: true })
      .first()
      .click();
    await dialog().getByLabel("Title", { exact: true }).fill(title);
    if (fill) await fill(dialog());
    await dialog()
      .getByRole("button", { name: /^Create / })
      .click();
    await page.waitForTimeout(150);
  };
  await go("/");
  await page.screenshot({ path: artifacts + "/desktop.png", fullPage: true });
  await go("/tasks");
  await create("Study calculus", "New task", async (d) => {
    await d.getByLabel("Priority", { exact: true }).selectOption("High");
  });
  await page
    .getByRole("button", { name: "Complete Study calculus", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Reopen Study calculus", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Edit Study calculus", exact: true })
    .click();
  await dialog().getByLabel("Title", { exact: true }).fill("Study algebra");
  await dialog().getByRole("button", { name: "Save changes" }).click();
  await go("/calendar");
  await create("Lecture", "New event", async (d) => {
    await d.getByLabel("Starts date", { exact: true }).fill("2026-10-24");
    await d.getByLabel("Starts hour", { exact: true }).selectOption("9");
    await d.getByLabel("Starts minute", { exact: true }).selectOption("00");
    await d.getByLabel("Starts AM or PM", { exact: true }).selectOption("AM");
    await d.getByLabel("Ends date", { exact: true }).fill("2026-10-24");
    await d.getByLabel("Ends hour", { exact: true }).selectOption("10");
    await d.getByLabel("Ends minute", { exact: true }).selectOption("00");
    await d.getByLabel("Ends AM or PM", { exact: true }).selectOption("AM");
  });
  await go("/notes");
  await create("Class notes", "New note", async (d) => {
    await d.getByLabel("Note content").fill("# Math\n\n**Keep learning**");
    await d.getByRole("button", { name: "Preview", exact: true }).click();
    await d.getByRole("heading", { name: "Math", exact: true }).waitFor();
  });
  await page.getByRole("button", { name: "Pin note", exact: true }).click();
  await go("/diary");
  await create("A good day", "Write an entry", async (d) => {
    await d.getByLabel("Diary content").fill("I made progress today.");
    await d.getByLabel("How are you feeling?").selectOption("Good");
  });
  await page.reload();
  await page
    .getByRole("heading", { name: "A good day", exact: true })
    .waitFor();
  await go("/goals");
  await create("Read twelve books", "New goal", async (d) => {
    await d.getByRole("slider").fill("25");
    await d
      .getByRole("textbox", { name: "New milestone", exact: true })
      .fill("First book");
    await d
      .getByRole("textbox", { name: "New milestone", exact: true })
      .press("Enter");
  });
  await page.getByRole("button", { name: "New habit", exact: true }).click();
  await dialog().getByLabel("Habit name").fill("Read");
  await dialog()
    .getByRole("button", { name: "Create habit", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Check in today", exact: true })
    .click();
  await go("/finance");
  await create("Lunch", "Add transaction", async (d) => {
    await d.getByLabel("Amount (PHP)").fill("150");
  });
  await page.getByText("−₱150.00", { exact: true }).waitFor();
  await go("/projects");
  await create("LifeOS", "New project", async (d) => {
    await d
      .getByLabel("Technology stack (comma separated)")
      .fill("React, Vite");
    await d
      .getByLabel("GitHub repository URL")
      .fill("https://github.com/example/lifeos");
  });
  await go("/settings");
  await page.getByLabel("Display name", { exact: true }).fill("Jericho");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadEvent;
  await download.saveAs(artifacts + "/backup.json");
  const backup = JSON.parse(
    fs.readFileSync(artifacts + "/backup.json", "utf8"),
  );
  for (const key of [
    "tasks",
    "events",
    "notes",
    "diary",
    "goals",
    "habits",
    "transactions",
    "projects",
  ])
    assert.equal(backup[key].length, 1, key);
  await page
    .locator('input[type=file][accept="application/json,.json"]')
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":1}'),
    });
  await page.getByRole("status").filter({ hasText: "not a LifeOS" }).waitFor();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("lifeos.v1")).tasks.length,
    ),
    1,
  );
  await page
    .locator('input[type=file][accept="application/json,.json"]')
    .setInputFiles(artifacts + "/backup.json");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: "imported" }).waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page
    .getByText("Ready to use offline on this device.", { exact: true })
    .waitFor();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("heading", { name: "Settings", exact: true }).waitFor();
  await page
    .getByText("You’re offline. Changes stay on this device.", { exact: true })
    .waitFor();
  await go("/diary");
  await create("Offline memory", "Write an entry", async (d) => {
    await d.getByLabel("Diary content").fill("Written with no internet.");
  });
  await page.reload();
  await page
    .getByRole("heading", { name: "Offline memory", exact: true })
    .waitFor();
  await context.setOffline(false);
  await go("/");
  await page.screenshot({
    path: artifacts + "/desktop-populated.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .locator("aside")
    .getByRole("link", { name: "Diary", exact: true })
    .click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: artifacts + "/mobile.png", fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "mobile overflow",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await go("/diary");
  await page
    .getByRole("button", { name: "Write an entry", exact: true })
    .click();
  await dialog()
    .getByLabel("Title", { exact: true })
    .fill("Autosaved reflection");
  await dialog()
    .getByLabel("Diary content")
    .fill("Saved when I close the editor.");
  await dialog().getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await page
    .getByRole("heading", { name: "Autosaved reflection", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Open global search" }).click();
  await page
    .getByLabel("Global search", { exact: true })
    .fill("Autosaved reflection");
  await page.locator(".palette-result").first().click();
  await dialog().getByLabel("Diary content").fill("An edited reflection.");
  await dialog().getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await page.reload();
  assert.equal(
    await page
      .getByRole("heading", { name: "Autosaved reflection", exact: true })
      .count(),
    0,
    "Deleted diary must not reappear from autosave",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all 8 record types, task edit/completion, note Markdown/pinning, diary persistence, habit check-in, finance totals, settings, backup export/import/rejection, offline reload/write, mobile navigation; no browser errors.",
  );
  console.log("Artifacts:", artifacts);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
