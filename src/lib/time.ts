export type ExpirationOption = "3m" | "1d" | "3d" | "7d" | "never";

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addMinutes(date: Date, minutes: number) {
  const next = new Date(date);
  next.setUTCMinutes(next.getUTCMinutes() + minutes);
  return next;
}

export function calculateExpiresAt(option: ExpirationOption, now = new Date()) {
  if (option === "never") return null;
  if (option === "3m") return addMinutes(now, 3);
  const days = option === "1d" ? 1 : option === "3d" ? 3 : 7;
  return addDays(now, days);
}
