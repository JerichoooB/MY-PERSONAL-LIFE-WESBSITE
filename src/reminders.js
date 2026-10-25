import { formatTime } from "./time.js";
export const DEFAULT_REMINDERS = {
  enabled: false,
  leadMinutes: 10,
  classes: true,
  events: true,
  tasks: true,
};
export const DELIVERY_KEY = "lifeos.notification-delivery.v1";
export function reminderItems(
  data,
  settings = data.settings.notifications || DEFAULT_REMINDERS,
) {
  const items = [];
  for (const event of data.events) {
    const school =
      event.category === "School" || event.id.startsWith("schedule:");
    if (!(school ? settings.classes : settings.events)) continue;
    const start = new Date(event.start).getTime(),
      end = new Date(event.end).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    items.push({
      key: `event:${event.id}:${event.start}`,
      kind: school ? "class" : "event",
      id: event.id,
      title: event.title,
      description: event.description || "",
      start,
      end,
      url: `#/calendar?date=${event.start.slice(0, 10)}`,
      time: formatTime(event.start),
    });
  }
  if (settings.tasks)
    for (const task of data.tasks) {
      if (task.completed || !task.date || !task.time) continue;
      const stamp = `${task.date}T${task.time}`,
        start = new Date(stamp).getTime();
      if (!Number.isFinite(start)) continue;
      items.push({
        key: `task:${task.id}:${stamp}`,
        kind: "task",
        id: task.id,
        title: task.title,
        description: `Task · ${task.category}`,
        start,
        end: start + 30 * 60 * 1000,
        url: "#/tasks",
        time: formatTime(task.time),
      });
    }
  return items.sort((a, b) => a.start - b.start);
}
export function dueReminders(data, now = Date.now(), delivered = {}) {
  const settings = data.settings.notifications || DEFAULT_REMINDERS;
  if (!settings.enabled) return [];
  return reminderItems(data, settings).filter(
    (item) =>
      !delivered[item.key] &&
      now >= item.start - settings.leadMinutes * 60000 &&
      now <= item.start + 60000,
  );
}
const escapeText = (text) =>
  String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const stamp = (time) =>
  new Date(time)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
function foldLine(line) {
  let current = "",
    bytes = 0;
  const lines = [];
  for (const char of line) {
    const length = new TextEncoder().encode(char).length;
    if (bytes + length > 75) {
      lines.push(current);
      current = " ";
      bytes = 1;
    }
    current += char;
    bytes += length;
  }
  lines.push(current);
  return lines.join("\r\n");
}
export function exportReminderCalendar(
  data,
  settings = data.settings.notifications || DEFAULT_REMINDERS,
  now = Date.now(),
) {
  const items = reminderItems(data, settings).filter(
    (item) => item.start >= now,
  );
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RIRI.DEV//Class and task reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:RIRI.DEV reminders",
  ];
  for (const item of items)
    lines.push(
      "BEGIN:VEVENT",
      `UID:${encodeURIComponent(item.key)}@riri.dev`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(item.start)}`,
      `DTEND:${stamp(item.end)}`,
      `SUMMARY:${escapeText(item.title)}`,
      `DESCRIPTION:${escapeText(item.description)}`,
      "BEGIN:VALARM",
      `TRIGGER:${settings.leadMinutes ? "-" : ""}PT${settings.leadMinutes}M`,
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(item.title)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  lines.push("END:VCALENDAR");
  return {
    content: lines.map(foldLine).join("\r\n") + "\r\n",
    count: items.length,
  };
}
export function notificationSupported() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}
export async function showSystemNotification(title, options) {
  if (!notificationSupported())
    throw Error(
      "System notifications require a supported browser and HTTPS. On iPhone, open the installed Home Screen app.",
    );
  if (Notification.permission !== "granted")
    throw Error(
      "Allow notifications for this app in your browser or phone settings.",
    );
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.active)
    throw Error(
      "The offline service is not ready yet. Reload the app online and try again.",
    );
  return registration.showNotification(title, {
    icon: new URL("icon-192.png", registration.scope).href,
    badge: new URL("icon-192.png", registration.scope).href,
    ...options,
  });
}
