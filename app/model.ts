export type Item = {
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
};
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
