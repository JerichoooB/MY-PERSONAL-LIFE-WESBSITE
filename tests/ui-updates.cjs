const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.LIFEOS_BASE_URL || "http://localhost:4173/";
  const go = async (path) => {
    await page.goto(base + "#" + path);
    await page.locator("main h1").waitFor();
  };
  const stored = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("lifeos.v1")));
  await go("/");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Title", { exact: true })
    .fill("Creative work");
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  const chip = page
    .locator(".category-chips")
    .getByRole("button", { name: "Creative work", exact: true });
  await chip.waitFor();
  assert.equal(await chip.getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "New Task", exact: true }).click();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByLabel("Category", { exact: true })
      .inputValue(),
    "Creative work",
  );
  await page
    .getByRole("dialog")
    .getByLabel("Title", { exact: true })
    .fill("Sketch the homepage");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await page
    .locator(".daily-task-name")
    .filter({ hasText: "Sketch the homepage" })
    .waitFor();
  await page.reload();
  await chip.waitFor();
  assert.ok((await stored()).categories.includes("Creative work"));
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Title", { exact: true })
    .fill("creative work");
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  await page.getByRole("alert").filter({ hasText: "already exists" }).waitFor();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  console.log(
    "PASS categories: new chips visible, auto-selected, task default, reload, duplicate protection",
  );
  await go("/settings");
  const original = (await stored()).settings.name;
  await page.getByLabel("Display name", { exact: true }).fill("Riri");
  await page.getByLabel("Default currency").selectOption("USD");
  assert.equal((await stored()).settings.name, original);
  await page.getByRole("button", { name: "Light", exact: true }).click();
  assert.equal(
    await page.getByLabel("Display name", { exact: true }).inputValue(),
    "Riri",
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  assert.equal((await stored()).settings.name, "Riri");
  assert.equal((await stored()).settings.currency, "USD");
  assert.equal((await stored()).settings.theme, "light");
  await page.getByLabel("Display name", { exact: true }).fill("Discard this");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(
    await page.getByLabel("Display name", { exact: true }).inputValue(),
    "Riri",
  );
  await page.reload();
  assert.equal(
    await page.getByLabel("Display name", { exact: true }).inputValue(),
    "Riri",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .isDisabled(),
    true,
  );
  console.log(
    "PASS personalization: explicit save, cancel, persistence, appearance preserved",
  );
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("lifeos.v1"));
    d.notes = [
      {
        id: "search-note",
        title: "Homepage planning",
        content: "Sketch the homepage with calm colors.",
        tags: "design",
        category: "Work",
        pinned: false,
        updatedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem("lifeos.v1", JSON.stringify(d));
  });
  await page.reload();
  await page.getByRole("button", { name: "Open global search" }).focus();
  await page.keyboard.press("Control+k");
  const search = page.getByLabel("Global search", { exact: true });
  await search.waitFor();
  assert.equal(
    await search.evaluate((el) => el === document.activeElement),
    true,
  );
  await search.fill("homepage");
  await page
    .locator(".palette-result")
    .filter({ hasText: "Sketch the homepage" })
    .first()
    .waitFor();
  assert.equal(await page.locator(".palette-result").count(), 2);
  assert.ok((await page.locator(".palette-result mark").count()) > 0);
  await page
    .getByRole("button", { name: "Notes", exact: false })
    .filter({ has: page.locator("small") })
    .click();
  assert.equal(await page.locator(".palette-result").count(), 1);
  await search.press("Enter");
  await page.getByRole("dialog", { name: "Edit note" }).waitFor();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Open global search" }).click();
  await search.fill("homepage");
  await search.press("ArrowDown");
  assert.equal(
    await search.getAttribute("aria-activedescendant"),
    "workspace-result-1",
  );
  await search.press("ArrowUp");
  assert.equal(
    await search.getAttribute("aria-activedescendant"),
    "workspace-result-0",
  );
  await search.fill("no-such-record");
  await page.getByRole("heading", { name: /No matches/ }).waitFor();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page
    .locator(".palette-result")
    .filter({ hasText: "Overview" })
    .waitFor();
  await search.press("Escape");
  assert.equal(
    await page
      .getByRole("button", { name: "Open global search" })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  console.log(
    "PASS search UI: shortcut, autofocus, highlights, filters, result editor, arrows, empty state, clear, Escape and focus restoration",
  );
  const artifacts = fs.mkdtempSync("/tmp/lifeos-ui-");
  await go("/settings");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "Open global search" }).click();
  await search.fill("homepage");
  await page.screenshot({ path: artifacts + "/search-desktop.png" });
  await search.press("Escape");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole("button", { name: "Open global search" }).click();
    await search.fill("homepage");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow at ${width}`,
    );
    const box = await page.locator(".search-palette").boundingBox();
    assert.ok(
      box.x >= 0 && box.x + box.width <= width,
      `palette width at ${width}`,
    );
    await search.press("Escape");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open global search" }).click();
  await search.fill("homepage");
  await page.screenshot({ path: artifacts + "/search-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS responsive search at 320, 390, 768, and 1440 px. Artifacts:",
    artifacts,
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
