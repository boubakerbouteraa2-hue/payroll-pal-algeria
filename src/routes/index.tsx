import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Users, CalendarX2, FileText, Save, Plus, Lock, Printer } from "lucide-react";
import {
  usePayroll, uid, todayStr, dzd, presentSinceStart, monthReport, absValue,
  downloadBackup, readBackup, lastBackupAt, isMobilePrint, printReportWindow,
  type Absence,
} from "@/lib/payroll";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مزرعة حميدي — أجور العمال" },
      { name: "description", content: "تسجيل غيابات العمال وحساب الأجور الشهرية بالدينار الجزائري لمزرعة حميدي." },
      { property: "og:title", content: "مزرعة حميدي — أجور العمال" },
      { property: "og:description", content: "حساب الأجور الشهرية وخصم الغيابات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

type Tab = "workers" | "absence" | "report" | "backup";

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function App() {
  const { data, setData, ready } = usePayroll();
  const [tab, setTab] = useState<Tab>("workers");
  const isFirst = new Date().getDate() === 1;
  const now = new Date();
  const thisMonth = monthKey(now);

  const stats = useMemo(() => {
    let absDays = 0;
    let net = 0;
    for (const w of data.workers) {
      const r = monthReport(w, data.absences, thisMonth);
      if (r) {
        absDays += r.absDays;
        net += r.net;
      }
    }
    return { workers: data.workers.length, absDays, net };
  }, [data, thisMonth]);

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-24">
      <header className="px-5 pb-4 pt-8 print:hidden">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="neon-dot" />
            مزرعة حميدي · نظام الأجور
          </span>
          <span className="neon-num">{now.getMonth() + 1}/{now.getFullYear()}</span>
        </div>
        <h1 className="mt-3 text-4xl font-black tracking-tight">كشف أجور العمال</h1>
      </header>

      <section className="grid grid-cols-3 gap-2 px-4 print:hidden">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">العمال</p>
          <p className="neon-num mt-1 text-3xl font-black text-primary">{stats.workers}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">الغياب</p>
          <p className="neon-num mt-1 text-3xl font-black text-destructive">{stats.absDays}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">الصافي</p>
          <p className="neon-num mt-1 text-lg font-black leading-8">{dzd(stats.net)}</p>
        </div>
      </section>

      {isFirst && (
        <button onClick={() => setTab("report")}
          className="mx-4 mt-3 block w-[calc(100%-2rem)] rounded-xl border border-primary/40 bg-accent p-4 text-right text-accent-foreground print:hidden">
          📋 بداية شهر جديد — تقرير الشهر الماضي جاهز. اضغط للعرض.
        </button>
      )}

      <main className="mx-auto mt-4 max-w-3xl px-4">
        {!ready ? null : tab === "workers" ? (
          <Workers data={data} setData={setData} />
        ) : tab === "absence" ? (
          <Absences data={data} setData={setData} />
        ) : tab === "backup" ? (
          <Backup data={data} setData={setData} />
        ) : (
          <Report data={data} defaultPrev={isFirst} />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t bg-card/95 backdrop-blur print:hidden">
        {([
          ["workers", "العمال", Users],
          ["absence", "الغياب", CalendarX2],
          ["report", "التقرير", FileText],
          ["backup", "النسخ", Save],
        ] as const).map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex flex-col items-center gap-1 py-3 text-xs font-bold ${tab === k ? "text-primary" : "text-muted-foreground"}`}>
            <Icon className="h-5 w-5" style={tab === k ? { filter: "drop-shadow(0 0 6px currentColor)" } : undefined} />
            {l}
          </button>
        ))}
      </nav>
    </div>
  );
}

type P = { data: ReturnType<typeof usePayroll>["data"]; setData: ReturnType<typeof usePayroll>["setData"] };

function Workers({ data, setData }: P) {
  const [name, setName] = useState("");
  const [salary, setSalary] = useState("");
  const [start, setStart] = useState(todayStr());

  const add = () => {
    if (!name.trim() || !Number(salary)) return;
    setData((d) => ({ ...d, workers: [...d.workers, { id: uid(), name: name.trim(), salary: Number(salary), startDate: start }] }));
    setName(""); setSalary("");
  };

  return (
    <div className="space-y-4">
      <section className="card-box space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Plus className="h-5 w-5 text-primary" /> إضافة عامل</h2>
        <input className="field" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field" type="number" placeholder="الأجر الشهري (د.ج)" value={salary} onChange={(e) => setSalary(e.target.value)} />
        <label className="block text-sm text-muted-foreground">تاريخ بداية العمل
          <input className="field mt-1" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <button className="btn-primary w-full" onClick={add}>إضافة</button>
      </section>

      {data.workers.map((w) => (
        <div key={w.id} className="card-box">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">{w.name}</h3>
              <p className="text-sm text-muted-foreground">منذ {w.startDate} · {dzd(w.salary)} / شهر</p>
            </div>
            <button className="text-sm text-destructive" onClick={() => {
              if (confirm(`حذف ${w.name}؟`))
                setData((d) => ({ workers: d.workers.filter((x) => x.id !== w.id), absences: d.absences.filter((a) => a.workerId !== w.id) }));
            }}>حذف</button>
          </div>
          <div className="mt-3 rounded-lg bg-secondary p-3 text-secondary-foreground">
            أيام الحضور من أول يوم عمل إلى اليوم: <b className="neon-num text-primary">{presentSinceStart(w, data.absences)}</b> يوم
          </div>
        </div>
      ))}
      {data.workers.length === 0 && (
        <p className="card-box text-center text-muted-foreground">لا يوجد عمال بعد — أضف عاملا من الأعلى.</p>
      )}
    </div>
  );
}

function Absences({ data, setData }: P) {
  const [workerId, setWorkerId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [type, setType] = useState<Absence["type"]>("full");
  const [msg, setMsg] = useState("");

  const add = () => {
    if (!workerId) return setMsg("اختر العامل");
    const w = data.workers.find((x) => x.id === workerId)!;
    if (date < w.startDate) return setMsg("التاريخ قبل بداية العمل");
    if (data.absences.some((a) => a.workerId === workerId && a.date === date))
      return setMsg("هذا اليوم مسجل مسبقا كغياب لهذا العامل");
    setData((d) => ({ ...d, absences: [...d.absences, { id: uid(), workerId, date, type }] }));
    setMsg("تم تسجيل الغياب ✓");
  };

  const sorted = [...data.absences].sort((a, b) => b.date.localeCompare(a.date));
  const nameOf = (id: string) => data.workers.find((w) => w.id === id)?.name ?? "";

  return (
    <div className="space-y-4">
      <section className="card-box space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold"><CalendarX2 className="h-5 w-5 text-destructive" /> تسجيل غياب</h2>
        <p className="text-sm text-muted-foreground">الحضور يُحتسب تلقائيا، سجّل الغياب فقط.</p>
        <select className="field" value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
          <option value="">اختر العامل</option>
          {data.workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          {([["full", "يوم كامل"], ["half", "نصف يوم"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setType(k)}
              className={`rounded-lg border py-3 font-bold ${type === k ? "border-destructive bg-destructive text-destructive-foreground shadow-[0_0_16px_oklch(0.63_0.24_350/0.4)]" : ""}`}>{l}</button>
          ))}
        </div>
        <button className="btn-primary w-full" onClick={add}>تسجيل</button>
        {msg && <p className="text-center text-sm">{msg}</p>}
      </section>

      {sorted.map((a) => (
        <div key={a.id} className="card-box flex items-center justify-between">
          <div>
            <b>{nameOf(a.workerId)}</b>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> {a.date} · <span className="text-destructive">{a.type === "full" ? "يوم كامل" : "نصف يوم"}</span>
            </p>
          </div>
          <button className="text-sm text-destructive" onClick={() => {
            if (confirm("إلغاء هذا الغياب؟")) setData((d) => ({ ...d, absences: d.absences.filter((x) => x.id !== a.id) }));
          }}>إلغاء</button>
        </div>
      ))}
      {sorted.length === 0 && <p className="card-box text-center text-muted-foreground">السجل فارغ — لا غيابات مسجلة.</p>}
    </div>
  );
}

function Report({ data, defaultPrev }: { data: P["data"]; defaultPrev: boolean }) {
  const now = new Date();
  const ref = defaultPrev ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now;
  const [month, setMonth] = useState(monthKey(ref));

  const rows = useMemo(
    () => data.workers.map((w) => ({ w, r: monthReport(w, data.absences, month) })).filter((x) => x.r),
    [data, month],
  );
  const total = rows.reduce((s, x) => s + x.r!.net, 0);
  const totalDed = rows.reduce((s, x) => s + x.r!.deduction, 0);

  const print = () => {
    if (!isMobilePrint()) return window.print();
    const ok = printReportWindow(
      month,
      rows.map(({ w, r }) => ({
        name: w.name, salary: w.salary, daily: r!.daily, absDays: r!.absDays,
        paidDays: r!.paidDays, baseDays: r!.baseDays, deduction: r!.deduction, net: r!.net,
      })),
      total,
      totalDed,
    );
    if (!ok) window.print();
  };

  return (
    <div className="space-y-4">
      <div className="card-box flex items-center gap-3 print:hidden">
        <input className="field" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <button className="btn-primary flex items-center gap-2 whitespace-nowrap" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> طباعة
        </button>
      </div>

      <h2 className="text-xl font-black">تقرير أجور شهر {month} — مزرعة حميدي</h2>
      <p className="text-sm text-muted-foreground">الأجر الشهري محسوب على 30 يوما.</p>

      {rows.map(({ w, r }) => (
        <div key={w.id} className="card-box">
          <div className="flex justify-between"><b className="text-lg">{w.name}</b><span className="neon-num">{dzd(w.salary)}</span></div>
          <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-muted-foreground">الأجر اليومي</span><span className="neon-num">{dzd(r!.daily)}</span>
            <span className="text-muted-foreground">أيام الغياب</span><span className="neon-num">{r!.absDays}</span>
            <span className="text-muted-foreground">الأيام المدفوعة</span><span className="neon-num">{r!.paidDays} / {r!.baseDays}</span>
            <span className="text-muted-foreground">مقابل الغياب (الخصم)</span><span className="neon-num text-destructive">− {dzd(r!.deduction)}</span>
          </div>
          {r!.list.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {r!.list.map((a) => `${a.date.slice(8)} (${absValue(a) === 1 ? "يوم" : "½"})`).join("، ")}
            </p>
          )}
          <div className="mt-3 flex justify-between border-t pt-2 font-bold">
            <span>الأجر الصافي</span><span className="neon-num text-primary">{dzd(r!.net)}</span>
          </div>
        </div>
      ))}

      <div className="card-box border-primary/40 p-5 shadow-[0_0_24px_oklch(0.86_0.23_152/0.15)]">
        <div className="flex justify-between text-sm text-muted-foreground"><span>مجموع الخصومات</span><span className="neon-num text-destructive">{dzd(totalDed)}</span></div>
        <div className="mt-2 flex justify-between text-xl font-black"><span>مجموع الأجور</span><span className="neon-num text-primary">{dzd(total)}</span></div>
      </div>
    </div>
  );
}

function Backup({ data, setData }: P) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const [at, setAt] = useState<string | null>(null);

  useEffect(() => setAt(lastBackupAt()), []);

  const save = () => {
    downloadBackup(data);
    setAt(lastBackupAt());
    setMsg("تم تنزيل النسخة ✓ احتفظ بالملف في مكان آمن.");
  };

  const restore = async (file?: File) => {
    if (!file) return;
    try {
      const clean = await readBackup(file);
      if (!confirm(`سيتم استرجاع ${clean.workers.length} عامل و${clean.absences.length} غياب وحذف الموجود حاليا. متابعة؟`)) return;
      setData(clean);
      setMsg("تم الاسترجاع ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "تعذّرت قراءة الملف");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <section className="card-box space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Save className="h-5 w-5 text-primary" /> نسخة احتياطية</h2>
        <p className="text-sm text-muted-foreground">
          كل تغيير يُحفظ فورا على هذا الجهاز. نزّل نسخة احتياطية واحتفظ بها عندك، وتستطيع استرجاعها في أي وقت أو على جهاز آخر.
        </p>
        <button className="btn-primary w-full" onClick={save}>تنزيل نسخة احتياطية</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
          onChange={(e) => restore(e.target.files?.[0])} />
        <button className="btn-primary w-full" onClick={() => fileRef.current?.click()}>استرجاع من ملف</button>
        <p className="text-center text-sm text-muted-foreground">
          {at ? `آخر نسخة: ${new Date(at).toLocaleDateString("ar-DZ")}` : "لم تُنزّل أي نسخة بعد."}
        </p>
        {msg && <p className="text-center text-sm">{msg}</p>}
      </section>
    </div>
  );
}
