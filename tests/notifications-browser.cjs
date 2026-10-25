const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await b.newContext({
    permissions: ["notifications"],
    viewport: { width: 390, height: 844 },
    timezoneId: "UTC",
  });
  await context.addInitScript(() => {
    window.acceptedNotifications = [];
    const original = ServiceWorkerRegistration.prototype.showNotification;
    ServiceWorkerRegistration.prototype.showNotification = async function (
      title,
      options,
    ) {
      const result = await original.call(this, title, options);
      window.acceptedNotifications.push({ title, ...options });
      return result;
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.LIFEOS_BASE_URL || "http://localhost:4173/";
  await page.goto(base + "#/settings");
  await page.locator("main h1").waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page
    .getByRole("button", { name: "Send test notification", exact: true })
    .click();
  await page.waitForFunction(() =>
    window.acceptedNotifications.some((n) => n.tag === "lifeos-test-reminder"),
  );
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    for (const n of await r.getNotifications()) n.close();
    const d = JSON.parse(localStorage.getItem("lifeos.v1"));
    const now = new Date();

    const later = new Date(now.getTime() + 5 * 60000);
    const start = later.toISOString().slice(0, 16);
    const end = new Date(later.getTime() + 60 * 60000);
    const finish = end.toISOString().slice(0, 16);
    d.events = [
      {
        id: "notification-class",
        title: "Reminder class",
        description: "Room: 302",
        category: "School",
        color: "#df9383",
        start,
        end: finish,
      },
    ];
    localStorage.setItem("lifeos.v1", JSON.stringify(d));
  });
  await page.reload();
  await page.getByLabel("Enable app reminders", { exact: true }).check();
  await page
    .getByRole("button", { name: "Save reminders", exact: true })
    .click();
  await page.waitForFunction(() =>
    window.acceptedNotifications.some((n) => n.title === "Reminder class"),
  );
  const notice = await page.evaluate(() => {
    const n = window.acceptedNotifications.find(
      (n) => n.title === "Reminder class",
    );
    return { title: n.title, body: n.body, url: n.data.url, tag: n.tag };
  });
  assert.ok(notice.body.includes("Room: 302"));
  assert.ok(notice.url.startsWith("#/calendar?date="));
  await page.reload();
  await page.locator("main h1").waitFor();
  await page.evaluate(async () => {
    window.dispatchEvent(new Event("focus"));
    await navigator.locks.request("lifeos-system-reminders", () => true);
  });
  const after = await page.evaluate(
    () =>
      window.acceptedNotifications.filter((n) => n.title === "Reminder class")
        .length,
  );
  assert.equal(
    after,
    0,
    "a delivered reminder must not be sent again after reload",
  );
  assert.equal(
    await page.getByLabel("Enable app reminders", { exact: true }).isChecked(),
    true,
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export calendar with alerts", exact: true })
    .click();
  const file = await download;
  const target = "/tmp/lifeos-reminders-test.ics";
  await file.saveAs(target);
  const ics = fs.readFileSync(target, "utf8");
  assert.ok(ics.includes("BEGIN:VALARM"));
  assert.ok(ics.includes("SUMMARY:Reminder class"));
  await page.goto(base + notice.url);
  await page.locator(".calendar-cell.selected").waitFor();
  assert.equal(
    await page
      .locator(".calendar-cell.selected")
      .getByRole("button")
      .filter({ hasText: "Reminder class" })
      .count(),
    1,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS actual service-worker system notifications, scheduled class delivery, duplicate suppression/reload, saved settings, calendar export alarms, dated calendar link, and mobile layout.",
  );
  await context.close();
  const denied = await b.newContext({ permissions: [] });
  const p = await denied.newPage();
  await p.goto(base + "#/settings");
  await p.locator("main h1").waitFor();
  await p.getByLabel("Enable app reminders", { exact: true }).check();
  await p.getByRole("button", { name: "Save reminders", exact: true }).click();
  await p
    .getByRole("status")
    .filter({ hasText: "Allow system notifications first" })
    .waitFor();
  assert.equal(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("lifeos.v1")).settings.notifications
          .enabled,
    ),
    false,
  );
  console.log(
    "PASS permission is opt-in; reminders cannot enable without consent.",
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
