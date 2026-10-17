export type Item = {
  revision?: string;
  id: string;
  kind: "task" | "habit" | "trip" | "note";
  title: string;
  date: string;
  time: string;
  priority: string;
  done: boolean;
  completedAt?: string;
  details: string;
  checks: string[];
  checkins: string[];
  repeat?: "none" | "daily" | "weekdays" | "weekends" | "custom";
  weekdays?: number[];
  reminder?: number;
  endDate?: string;
  lodging?: string;
  reservations?: string;
  packing?: string[];
  itinerary?: {
    id: string;
    title: string;
    date: string;
    time: string;
    done: boolean;
  }[];
};
export function recurring(i: Item) {
  return i.kind === "habit" || Boolean(i.repeat && i.repeat !== "none");
}
export function scheduled(i: Item, day: string) {
  if (i.date && day < i.date) return false;
  if (!recurring(i)) return !i.date || i.date === day;
  const weekday = new Date(day + "T12:00:00Z").getUTCDay();
  switch (i.repeat) {
    case "weekdays":
      return weekday > 0 && weekday < 6;
    case "weekends":
      return weekday === 0 || weekday === 6;
    case "custom":
      return (i.weekdays || []).includes(weekday);
    default:
      return true;
  }
}
export function completed(i: Item, day: string) {
  return recurring(i) ? i.checkins.includes(day) : i.done;
}
export function shiftDate(day: string, days: number) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function weekSummary(items: Item[], end: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = shiftDate(end, index - 6);
    const tasks = items.filter(
      (i) =>
        i.kind === "task" &&
        (recurring(i)
          ? i.checkins.includes(day)
          : i.done && i.completedAt === day),
    ).length;
    const habits = items.filter(
      (i) => i.kind === "habit" && i.checkins.includes(day),
    ).length;
    return { day, tasks, habits };
  });
}
export function today() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}
export function streak(dates: string[]) {
  let d = new Date(today() + "T12:00:00Z"),
    count = 0;
  const key = () => d.toISOString().slice(0, 10);
  if (!dates.includes(key())) d.setUTCDate(d.getUTCDate() - 1);
  while (dates.includes(key())) {
    count++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return count;
}
export function longestStreak(dates: string[]) {
  const sorted = [...new Set(dates)].sort();
  let best = 0,
    count = 0,
    previous = 0;
  for (const date of sorted) {
    const value = Date.parse(date + "T12:00:00Z");
    count = value - previous === 86400000 ? count + 1 : 1;
    best = Math.max(best, count);
    previous = value;
  }
  return best;
}
