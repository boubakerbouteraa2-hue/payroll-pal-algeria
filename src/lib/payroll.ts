import { useEffect, useState } from "react";

export type Worker = { id: string; name: string; salary: number; startDate: string };
export type Absence = { id: string; workerId: string; date: string; type: "full" | "half" };
type Data = { workers: Worker[]; absences: Absence[] };

const KEY = "hamidi-farm-payroll-v1";

export function usePayroll() {
  const [data, setData] = useState<Data>({ workers: [], absences: [] });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(data));
  }, [data, ready]);
  return { data, setData, ready };
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function todayStr() {
  const d = new Date();
  return toStr(d);
}
export function toStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parse(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function daysBetween(a: string, b: string) {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000) + 1;
}

export const dzd = (n: number) =>
  new Intl.NumberFormat("ar-DZ", { maximumFractionDigits: 2 }).format(n) + " د.ج";

export const absValue = (a: Absence) => (a.type === "full" ? 1 : 0.5);

/** Days present from first work day up to today, minus absences. */
export function presentSinceStart(w: Worker, absences: Absence[]) {
  const today = todayStr();
  if (w.startDate > today) return 0;
  const total = daysBetween(w.startDate, today);
  const abs = absences
    .filter((a) => a.workerId === w.id && a.date >= w.startDate && a.date <= today)
    .reduce((s, a) => s + absValue(a), 0);
  return total - abs;
}

/** Monthly payroll: salary computed on a fixed 30-day month. */
export function monthReport(w: Worker, absences: Absence[], month: string) {
  const [y, m] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = toStr(new Date(y, m, 0));
  if (w.startDate > monthEnd) return null;
  const daily = w.salary / 30;
  const baseDays = w.startDate > monthStart ? Math.max(0, 30 - (parse(w.startDate).getDate() - 1)) : 30;
  const list = absences.filter(
    (a) => a.workerId === w.id && a.date >= monthStart && a.date <= monthEnd && a.date >= w.startDate,
  );
  const absDays = list.reduce((s, a) => s + absValue(a), 0);
  const paidDays = Math.max(0, baseDays - absDays);
  const deduction = absDays * daily;
  return { daily, baseDays, absDays, paidDays, deduction, net: paidDays * daily, list };
}
