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
import { scheduled, completed, weekSummary } from "./model.ts";
import { itemSchema } from "./lib/schema.ts";
const base = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  kind: "task",
  title: "Rotina",
  date: "2026-10-01",
  time: "09:00",
  priority: "Média",
  done: false,
  details: "",
  checks: [],
  checkins: [],
  repeat: "weekdays",
};
test("recurrence respects weekdays, weekends, custom days and start date", () => {
  assert.equal(scheduled(base, "2026-10-16"), true);
  assert.equal(scheduled(base, "2026-10-17"), false);
  assert.equal(scheduled({ ...base, repeat: "weekends" }, "2026-10-17"), true);
  assert.equal(
    scheduled({ ...base, repeat: "custom", weekdays: [6] }, "2026-10-17"),
    true,
  );
  assert.equal(scheduled({ ...base, repeat: "daily" }, "2026-09-30"), false);
});
test("recurring completion resets the next day without losing history", () => {
  const task = { ...base, repeat: "daily", checkins: ["2026-10-16"] };
  assert.equal(completed(task, "2026-10-16"), true);
  assert.equal(completed(task, "2026-10-17"), false);
  assert.equal(
    weekSummary([task], "2026-10-17").reduce((n, d) => n + d.tasks, 0),
    1,
  );
});
test("weekly summary counts completion date and deduplicates checkins", () => {
  const task = {
    ...base,
    repeat: "none",
    done: true,
    completedAt: "2026-10-16",
  };
  const habit = {
    ...base,
    kind: "habit",
    checkins: ["2026-10-16", "2026-10-16"],
  };
  const summary = weekSummary([task, habit], "2026-10-17");
  assert.equal(summary[5].tasks, 1);
  assert.equal(summary[5].habits, 1);
  assert.equal(summary[6].tasks, 0);
});
test("validation rejects impossible dates, times, empty recurrence and reversed trips", () => {
  assert.equal(
    itemSchema.safeParse({ ...base, date: "2026-02-30" }).success,
    false,
  );
  assert.equal(itemSchema.safeParse({ ...base, time: "25:00" }).success, false);
  assert.equal(
    itemSchema.safeParse({ ...base, repeat: "custom", weekdays: [] }).success,
    false,
  );
  assert.equal(
    itemSchema.safeParse({ ...base, kind: "trip", endDate: "2026-09-30" })
      .success,
    false,
  );
  assert.equal(itemSchema.safeParse(base).success, true);
});
