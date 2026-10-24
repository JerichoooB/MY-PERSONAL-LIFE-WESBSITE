export function to12Hour(value) {
  const match = String(value || "").match(/(?:^|T)([01]\d|2[0-3]):([0-5]\d)/);
  if (!match) return { hour: "", minute: "00", period: "AM" };
  const hour = Number(match[1]);
  return {
    hour: String(hour % 12 || 12),
    minute: match[2],
    period: hour < 12 ? "AM" : "PM",
  };
}
export function from12Hour({ hour, minute, period }) {
  if (
    !/^(?:[1-9]|1[0-2])$/.test(String(hour)) ||
    !/^\d{2}$/.test(minute) ||
    Number(minute) > 59 ||
    !["AM", "PM"].includes(period)
  )
    return "";
  return `${String((Number(hour) % 12) + (period === "PM" ? 12 : 0)).padStart(2, "0")}:${minute}`;
}
export function formatTime(value) {
  if (!value) return "";
  const p = to12Hour(value);
  return p.hour ? `${p.hour}:${p.minute} ${p.period}` : "";
}
export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${formatTime(value)}`;
}
