import { useEffect, useState } from "react";

export type Worker = { id: string; name: string; salary: number; startDate: string };
export type Absence = { id: string; workerId: string; date: string; type: "full" | "half" };
export type Data = { workers: Worker[]; absences: Absence[] };

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
  const [y = 0, m = 1, d = 1] = s.split("-").map(Number);
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
  const [y = 0, m = 1] = month.split("-").map(Number);
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

/** ---------- printing ---------- */

/** True on phones / installed app where window.print() is often a no-op. */
export function isMobilePrint() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export type PrintRow = {
  name: string;
  salary: number;
  daily: number;
  absDays: number;
  paidDays: number;
  baseDays: number;
  deduction: number;
  net: number;
};

/** Opens a ready-to-print report in a new window (for phones where window.print fails). */
export function printReportWindow(month: string, rows: PrintRow[], total: number, totalDed: number) {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const body = rows
    .map(
      (r) => `<div class="card">
        <div class="head"><span class="name">${esc(r.name)}</span><span class="muted">${dzd(r.salary)}</span></div>
        <div class="row"><span>الأجر اليومي</span><span class="muted">${dzd(r.daily)}</span></div>
        <div class="row"><span>أيام الغياب</span><span class="muted">${r.absDays}</span></div>
        <div class="row"><span>الأيام المدفوعة</span><span class="muted">${r.paidDays} / ${r.baseDays}</span></div>
        <div class="row"><span>مقابل الغياب (الخصم)</span><span class="pink">− ${dzd(r.deduction)}</span></div>
        <div class="net"><span>الأجر الصافي</span><span class="green">${dzd(r.net)}</span></div>
      </div>`,
    )
    .join("");
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>تقرير أجور شهر ${month} — مزرعة حميدي</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}
      body{font-family:Cairo,sans-serif;color:#222;padding:20px;max-width:720px;margin:auto;background:#fff}
      h1{font-size:18px;color:#666;margin:0 0 4px}
      .sub{font-size:12px;color:#555;margin:0 0 14px}
      .card{border:1px solid #e3e6e8;border-radius:12px;padding:12px 14px;margin-bottom:12px;box-shadow:0 3px 10px rgba(0,0,0,.12);break-inside:avoid}
      .head,.row,.net{display:flex;justify-content:space-between;align-items:center}
      .name{font-weight:800;font-size:16px;color:#555}
      .row{font-size:12.5px;padding:3px 0}
      .row span:last-child{min-width:35%;text-align:right}
      .muted{color:#888}
      .pink{color:#c2187a}
      .green{color:#10c463;font-weight:800;text-shadow:0 0 6px rgba(16,196,99,.45)}
      .net{border-top:1px solid #e6efe9;margin-top:8px;padding-top:8px;color:#666}
      .tot{border:1px solid #9fe8c2;border-radius:12px;padding:12px 16px;break-inside:avoid}
      .tot .row{font-size:13px}
      .tot .big{font-size:17px;font-weight:800;color:#555}
      .tot .big .green{font-size:18px}
    </style></head><body>
    <h1>تقرير أجور شهر ${month} — مزرعة حميدي</h1>
    <p class="sub">الأجر الشهري محسوب على 30 يوما.</p>
    ${body}
    <div class="tot">
      <div class="row"><span>مجموع الخصومات</span><span class="pink">${dzd(totalDed)}</span></div>
      <div class="row big"><span>مجموع الأجور</span><span class="green">${dzd(total)}</span></div>
    </div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),400);}<\/script>
    </body></html>`;
  // Installed app (standalone): print and blank popups are blocked, so hand the
  // report to the phone as a file (share sheet → print / PDF / WhatsApp, or download).
  if (window.matchMedia("(display-mode: standalone)").matches) {
    const name = `تقرير-${month}-مزرعة-حميدي.html`;
    const file = new File([html], name, { type: "text/html" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      nav.share({ files: [file], title: name }).catch(() => {});
      return true;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  }
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}

/** ---------- backup / restore ---------- */
const BACKUP_KEY = "hamidi-farm-payroll-backup-at";

export function lastBackupAt(): string | null {
  try {
    return localStorage.getItem(BACKUP_KEY);
  } catch {
    return null;
  }
}

/** Downloads the whole payroll as a .json file the user keeps. */
export function downloadBackup(data: Data) {
  const payload = {
    app: "mazraat-hamidi",
    version: 1,
    exportedAt: new Date().toISOString(),
    workers: data.workers,
    absences: data.absences,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `مزرعة-حميدي-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  try {
    localStorage.setItem(BACKUP_KEY, new Date().toISOString());
  } catch {}
}

/** Reads a backup file, checks it, and returns clean data. Throws on bad files. */
export async function readBackup(file: File): Promise<Data> {
  let raw: any;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error("الملف غير صالح — يجب أن يكون ملف نسخة احتياطية");
  }
  const workers = Array.isArray(raw?.workers) ? raw.workers : raw?.data?.workers;
  const absences = Array.isArray(raw?.absences) ? raw.absences : raw?.data?.absences;
  if (!Array.isArray(workers) || !Array.isArray(absences))
    throw new Error("هذا الملف ليس نسخة احتياطية لمزرعة حميدي");

  const clean: Data = {
    workers: workers
      .filter((w: any) => w && typeof w.id === "string" && typeof w.name === "string")
      .map((w: any) => ({
        id: String(w.id),
        name: String(w.name),
        salary: Number(w.salary) || 0,
        startDate: String(w.startDate ?? todayStr()),
      })),
    absences: absences
      .filter((a: any) => a && typeof a.workerId === "string" && typeof a.date === "string")
      .map((a: any) => ({
        id: String(a.id ?? uid()),
        workerId: String(a.workerId),
        date: String(a.date),
        type: a.type === "half" ? ("half" as const) : ("full" as const),
      })),
  };
  const ids = new Set(clean.workers.map((w) => w.id));
  clean.absences = clean.absences.filter((a) => ids.has(a.workerId));
  if (clean.workers.length === 0) throw new Error("النسخة لا تحتوي على أي عامل");
  return clean;
}
