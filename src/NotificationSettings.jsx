import React, { useState, useEffect } from "react";
import { Bell, Download, CheckCircle2 } from "lucide-react";
import SaveActions, { useDraft } from "./SaveActions";
import {
  DEFAULT_REMINDERS,
  notificationSupported,
  showSystemNotification,
  exportReminderCalendar,
} from "./reminders.js";
import "./notifications.css";
export default function NotificationSettings({ data, onSave, notify }) {
  const { draft, setDraft, dirty, reset } = useDraft(
    data.settings.notifications || DEFAULT_REMINDERS,
  );
  const [permission, setPermission] = useState(() =>
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission,
  );
  const [busy, setBusy] = useState(false);
  const supported = notificationSupported();
  useEffect(() => {
    const refresh = () =>
      setPermission(
        typeof Notification === "undefined"
          ? "unsupported"
          : Notification.permission,
      );
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const enable = async () => {
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        setDraft((s) => ({ ...s, enabled: true }));
        notify("Permission granted. Save any reminder changes below.");
      } else
        notify(
          "Notifications were not allowed. You can change permission in your browser or phone settings.",
        );
    } catch {
      notify(
        "Could not request permission. On iPhone, use the installed Home Screen app.",
      );
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    setBusy(true);
    try {
      await showSystemNotification("RIRI.DEV test reminder", {
        body: "System notifications work on this device.",
        tag: "lifeos-test-reminder",
        data: { url: "#/settings" },
      });
      notify("Test notification sent. Check your system notifications.");
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  };
  const download = () => {
    const result = exportReminderCalendar(data, draft);
    if (!result.count) {
      notify(
        "Add future calendar events or tasks with due times, then export again.",
      );
      return;
    }
    const url = URL.createObjectURL(
      new Blob([result.content], { type: "text/calendar;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "riri-reminders.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`${result.count} upcoming items exported with reminder alerts.`);
  };
  return (
    <section className="panel mt">
      <div className="panel-heading">
        <div>
          <h2>Class & task notifications</h2>
          <p>Choose reminders for this device.</p>
        </div>
        <Bell size={20} color="var(--muted)" />
      </div>
      <div className="settings-body notification-settings">
        <div
          className={`notification-status ${permission === "granted" ? "allowed" : ""}`}
        >
          <CheckCircle2 size={18} />
          <span>
            {!supported
              ? "System notifications unavailable in this browser"
              : permission === "granted"
                ? "Permission allowed on this device"
                : permission === "denied"
                  ? "Notifications blocked in browser settings"
                  : "Notification permission not requested"}
          </span>
        </div>
        <p className="muted">
          App reminders work while RIRI.DEV is running. Closing the app or your
          phone suspending it can stop reminders. For alerts when the app is
          fully closed, export to your phone’s calendar below.
        </p>
        {supported && permission !== "granted" && (
          <button
            className="button"
            disabled={busy || permission === "denied"}
            onClick={enable}
          >
            Allow system notifications
          </button>
        )}
        {permission === "denied" && (
          <p className="muted">
            Open your browser/site or phone notification settings, allow
            notifications for this app, then return here.
          </p>
        )}
        <label className="notification-toggle">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) =>
              setDraft((s) => ({ ...s, enabled: e.target.checked }))
            }
          />
          Enable app reminders
        </label>
        <label>
          Remind me before
          <select
            aria-label="Remind me before"
            value={draft.leadMinutes}
            onChange={(e) =>
              setDraft((s) => ({ ...s, leadMinutes: Number(e.target.value) }))
            }
          >
            {[0, 5, 10, 15, 30, 60].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "At the start" : `${n} minutes before`}
              </option>
            ))}
          </select>
        </label>
        <div className="notification-types">
          {[
            ["classes", "Classes & school events"],
            ["events", "Other calendar events"],
            ["tasks", "Tasks with due times"],
          ].map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={draft[key]}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, [key]: e.target.checked }))
                }
              />
              {label}
            </label>
          ))}
        </div>
        <p className="muted">
          Habits, diary entries, and untimed tasks don’t have scheduled reminder
          times. Your device’s sound, Focus, and Do Not Disturb settings control
          how alerts appear.
        </p>
        <SaveActions
          label="Save reminders"
          dirty={dirty}
          onCancel={reset}
          onSave={() => {
            if (draft.enabled && (!supported || permission !== "granted")) {
              notify(
                "Allow system notifications first, or turn off app reminders to save these preferences.",
              );
              return;
            }
            onSave(draft);
          }}
        />
        <button
          className="button secondary"
          disabled={busy || !supported || permission !== "granted"}
          onClick={test}
        >
          Send test notification
        </button>
        <div className="calendar-reminder-export">
          <strong>Alerts when the app is closed</strong>
          <p>
            Download upcoming events and timed tasks with the selected alert
            timing. Import the .ics file into Apple Calendar, Google Calendar
            (web import), or Outlook, and allow that calendar’s notifications.
          </p>
          <button className="button secondary" onClick={download}>
            <Download size={16} />
            Export calendar with alerts
          </button>
          <small>
            Export uses the choices shown above. This is a calendar copy; later
            changes in RIRI.DEV won’t sync automatically. Reimporting may create
            duplicates in some calendar apps.
          </small>
        </div>
      </div>
    </section>
  );
}
