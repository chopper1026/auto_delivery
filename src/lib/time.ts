export type ExpirationOption = "1d" | "3d" | "7d" | "never";

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function calculateExpiresAt(option: ExpirationOption, now = new Date()) {
  if (option === "never") return null;
  const days = option === "1d" ? 1 : option === "3d" ? 3 : 7;
  return addDays(now, days);
}
