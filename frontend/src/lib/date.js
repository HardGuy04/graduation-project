import { format } from "date-fns";

/** "yyyy-MM-dd" → Date theo giờ địa phương (tránh lệch ngày do UTC). */
export function parseISODate(str) {
  if (!str) return undefined;
  const [y, m, d] = String(str).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

export const toISODate = (date) => (date ? format(date, "yyyy-MM-dd") : "");
