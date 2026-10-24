// Keep the existing search scope and substring matching; presentation lives in GlobalSearch.
export const SEARCH_TYPES = [
  { kind: "tasks", label: "Tasks", route: "/tasks" },
  { kind: "events", label: "Events", route: "/calendar" },
  { kind: "notes", label: "Notes", route: "/notes" },
  { kind: "diary", label: "Diary", route: "/diary" },
  { kind: "goals", label: "Goals", route: "/goals" },
  { kind: "projects", label: "Projects", route: "/projects" },
];
export const normalizeSearch = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();
export function searchWorkspace(data, query, { kind = "all" } = {}) {
  const term = normalizeSearch(query);
  if (!term) return [];
  return SEARCH_TYPES.filter((t) => kind === "all" || t.kind === kind).flatMap(
    (type) =>
      (data[type.kind] || [])
        .filter((item) =>
          `${item.title} ${item.content || item.description || ""}`
            .toLowerCase()
            .includes(term),
        )
        .map((item) => ({
          ...type,
          item,
          preview: (item.content || item.description || "")
            .replace(/\s+/g, " ")
            .slice(0, 150),
        })),
  );
}
// Return text nodes and marks, never HTML. Preserve source offsets through accents.
export function highlightMatches(value, query) {
  const text = String(value ?? "");
  const tokens = normalizeSearch(query)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .split(" ")
    .filter(Boolean);
  if (!tokens.length) return [{ text, match: false }];
  let folded = "",
    offset = 0;
  const positions = [];
  for (const char of text) {
    const part = char
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase();
    for (let i = 0; i < part.length; i++)
      positions.push([offset, offset + char.length]);
    folded += part;
    offset += char.length;
  }
  const ranges = [];
  for (const token of tokens) {
    let at = folded.indexOf(token);
    while (at !== -1) {
      ranges.push([positions[at][0], positions[at + token.length - 1][1]]);
      at = folded.indexOf(token, at + token.length);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  const parts = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor)
      parts.push({ text: text.slice(cursor, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length)
    parts.push({ text: text.slice(cursor), match: false });
  return parts.length ? parts : [{ text, match: false }];
}
