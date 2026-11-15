const DAY_MS = 86_400_000;
const shortDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "UTC" });
const jakartaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const jakartaTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const toTime = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`);
const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);

export function toJakartaIsoDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return toIso(Date.now());
  return jakartaDate.format(d);
}

export function formatTime(input: string | null | undefined): string {
  if (!input) return "-";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "-";
  return jakartaTime.format(d).replace(":", ".");
}

export function dayLabel(isoDate: string, today: string): string {
  const diff = Math.round((toTime(today) - toTime(isoDate)) / DAY_MS);
  if (diff === 0) return "Hari Ini";
  if (diff === 1) return "Kemarin";
  return shortDate.format(toTime(isoDate));
}

export function lastDays(today: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const time = toTime(today) - (count - 1 - i) * DAY_MS;
    const date = new Date(time);
    return { iso: toIso(time), day: date.getUTCDate(), weekday: weekday.format(date) };
  });
}

export function groupByDay<T extends { date: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(item.date, [...(groups.get(item.date) ?? []), item]);
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}
