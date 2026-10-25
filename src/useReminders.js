import { useEffect, useRef } from "react";
import {
  dueReminders,
  DELIVERY_KEY,
  notificationSupported,
  showSystemNotification,
} from "./reminders.js";
export default function useReminders(data, notify) {
  const current = useRef(data);
  current.current = data;
  useEffect(() => {
    if (!notificationSupported()) return;
    let stopped = false,
      running = false,
      reported = false;
    const dispatch = async () => {
      if (
        stopped ||
        Notification.permission !== "granted" ||
        !current.current.settings.notifications?.enabled
      )
        return;
      let delivered;
      try {
        delivered = JSON.parse(localStorage.getItem(DELIVERY_KEY) || "{}");
        if (
          !delivered ||
          typeof delivered !== "object" ||
          Array.isArray(delivered)
        )
          delivered = {};
      } catch {
        return;
      }
      const now = Date.now();
      for (const [key, when] of Object.entries(delivered))
        if (typeof when !== "number" || now - when > 14 * 86400000)
          delete delivered[key];
      for (const item of dueReminders(current.current, now, delivered)) {
        if (stopped) break;
        // Reserve delivery under the cross-tab lock. Roll back if showing fails.
        delivered[item.key] = now;
        try {
          localStorage.setItem(DELIVERY_KEY, JSON.stringify(delivered));
          await showSystemNotification(item.title, {
            body: `${item.kind === "task" ? "Due" : "Starts"} at ${item.time}${item.description ? ` · ${item.description.split("\n")[0]}` : ""}`,
            tag: item.key,
            data: { url: item.url },
            renotify: false,
          });
          reported = false;
        } catch {
          delete delivered[item.key];
          try {
            localStorage.setItem(DELIVERY_KEY, JSON.stringify(delivered));
          } catch {}
          if (!reported) {
            notify(
              "A reminder could not be shown. Check notification permission and app storage in Settings.",
            );
            reported = true;
          }
          break;
        }
      }
    };
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        if (navigator.locks)
          await navigator.locks.request(
            "lifeos-system-reminders",
            { ifAvailable: true },
            (lock) => (lock ? dispatch() : undefined),
          );
        else await dispatch();
      } catch {
      } finally {
        running = false;
      }
    };
    tick();
    const timer = setInterval(tick, 15000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [data.settings.notifications, data.events, data.tasks, notify]);
}
