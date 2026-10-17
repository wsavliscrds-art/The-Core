import { test } from "node:test";
import assert from "node:assert/strict";
import { today, streak, longestStreak } from "./model.ts";
test("longest streak survives a break and ignores duplicate check-ins", () => {
  assert.equal(
    longestStreak([
      "2026-10-01",
      "2026-10-02",
      "2026-10-02",
      "2026-10-03",
      "2026-10-08",
    ]),
    3,
  );
  assert.equal(longestStreak([]), 0);
});
test("current streak includes yesterday before today is checked", () => {
  const d = new Date(today() + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);
  assert.equal(streak([yesterday]), 1);
  assert.equal(streak([yesterday, today()]), 2);
  assert.equal(streak([]), 0);
});
