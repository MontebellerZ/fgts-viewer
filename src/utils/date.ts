import type { Transaction } from "../types";

export function parseDate(value: string): Date {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day);
}

export function monthToDate(month: string): Date {
  const [monthNum, year] = month.split("/").map(Number);
  return new Date(year, monthNum - 1, 1);
}

export function parseDateSafe(value: string): Date | null {
  const parts = value.split("/").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [day, month, year] = parts;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sortTransactionsByDate<T extends Transaction>(transactions: T[]): T[] {
  return [...transactions].sort((a, b) => {
    const dateA = parseDateSafe(a.date);
    const dateB = parseDateSafe(b.date);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });
}
