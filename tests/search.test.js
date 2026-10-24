import test from "node:test";
import assert from "node:assert/strict";
import { initialData } from "../src/data.js";
import { searchWorkspace, highlightMatches } from "../src/search.js";
const fixture = () => {
  const d = initialData();
  d.tasks = [{ id: "t1", title: "Design portfolio", category: "Work" }];
  d.notes = [
    {
      id: "n1",
      title: "Reference notes",
      content: "Ideas for my design portfolio",
      tags: "frontend",
    },
  ];
  d.diary = [
    { id: "d1", title: "A thoughtful day", content: "Progress on my project" },
  ];
  d.projects = [
    { id: "p1", title: "LifeOS", description: "Build a personal workspace" },
  ];
  d.goals = [
    { id: "g1", title: "Learn Spanish", description: "Practice every day" },
  ];
  d.events = [
    { id: "e1", title: "Team meeting", description: "Discuss frontend design" },
  ];
  return d;
};
test("redesigned search preserves existing title/content substring matching and record order", () => {
  const d = fixture();
  assert.deepEqual(
    searchWorkspace(d, "DESIGN").map((r) => r.item.id),
    ["t1", "e1", "n1"],
  );
  assert.equal(searchWorkspace(d, "design portfolio")[0].item.id, "t1");
  assert.equal(searchWorkspace(d, "design missing").length, 0);
  assert.equal(searchWorkspace(d, "frontend")[0].item.id, "e1");
  assert.equal(searchWorkspace(d, "portfolip").length, 0);
  assert.equal(searchWorkspace(d, "work").length, 1);
  assert.equal(searchWorkspace(d, "   ").length, 0);
});
test("type filters and destinations support opening the right editor without mutating data", () => {
  const d = fixture();
  const before = JSON.stringify(d);
  assert.deepEqual(
    searchWorkspace(d, "design", { kind: "notes" }).map((r) => r.item.id),
    ["n1"],
  );
  assert.equal(searchWorkspace(d, "meeting")[0].route, "/calendar");
  assert.equal(searchWorkspace(d, "thoughtful")[0].route, "/diary");
  assert.equal(JSON.stringify(d), before);
});
test("highlights preserve source text and render markup as plain text nodes", () => {
  const text = "Design <script>alert(1)</script> portfolio";
  const parts = highlightMatches(text, "design portfolio");
  assert.equal(parts.map((p) => p.text).join(""), text);
  assert.deepEqual(
    parts.filter((p) => p.match).map((p) => p.text),
    ["Design", "portfolio"],
  );
  assert.deepEqual(
    highlightMatches("Banana", "ana nana")
      .filter((p) => p.match)
      .map((p) => p.text),
    ["anana"],
  );
  assert.deepEqual(highlightMatches("Hello", ""), [
    { text: "Hello", match: false },
  ]);
});
