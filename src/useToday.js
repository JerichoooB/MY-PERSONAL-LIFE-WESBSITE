import { useEffect, useState } from "react";
import { dateKey } from "./data.js";
export default function useToday() {
  const [today, setToday] = useState(dateKey);
  useEffect(() => {
    let timer;
    const refresh = () => {
      setToday(dateKey());
      clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 50);
      timer = setTimeout(refresh, midnight.getTime() - now.getTime());
    };
    const visible = () => {
      if (!document.hidden) refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  return today;
}
