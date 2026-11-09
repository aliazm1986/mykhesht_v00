"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, BookOpenCheck, FileOutput, FileText, LoaderCircle, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

type Source = { id: string; title: string; category: string; reviewStatus: string; sourceKind: string; characterCount: number; pageCount: number | null };
type Content = {
  generatedAt: number;
  evidence: Array<{ documentId: string; title: string; category: string; sourceKind: string; characterCount: number; pageCount: number | null; reviewStatus: string; excerpt: string }>;
  controls: Array<{ title: string; detail: string }>;
  limitations: string[];
  conclusion: string;
  projectSummary?: {description:string;location:string;outcome:string;horizonMonths:number;risks:Array<{title:string;trigger:string;response:string}>};
  financialScenario?: {id:string;name:string;createdAt:number;results:Array<{key:string;label:string;roiPercent:number;profit:number}>} | null;
};
type Report = {isCurrent?:boolean; id: string; title: string; status: "draft"; scopeNote: string; sourceDocumentIds: string[]; content: Content | null; generatedAt: number };
type Payload = { permissions: { canGenerate: boolean }; sources: Source[]; reports: Report[]; error?: string };

const reviewLabels: Record<string, string> = { pending: "بازبینی نشده", approved: "بازبینی شد", needs_revision: "نیازمند اصلاح", rejected: "رد شده" };
const sourceKindLabels: Record<string, string> = { browser_pdfjs: "استخراج PDF در مرورگر", manual_entry: "متن ثبت‌شده توسط کاربر", ocr_human_confirmed: "متن OCR با تأیید انسانی" };

function date(value: number) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function extractCount(value: number) {
  return `${value.toLocaleString("fa-IR")} نویسه`;
}

export function SampleReportStudio({ projectSlug }: { projectSlug: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [scopeNote, setScopeNote] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sample-reports?project=${encodeURIComponent(projectSlug)}`, { cache: "no-store" });
      const data = await response.json() as Payload;
      if (!response.ok) throw new Error(data.error || "گزارش‌های آزمایشی دریافت نشدند.");
      setPayload(data);
      setSelectedId((current) => current || data.reports[0]?.id || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "خطا در دریافت گزارش آزمایشی");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [projectSlug]);
  useEffect(() => {
    const refresh = (event: Event) => {
      if ((event as CustomEvent<{ projectSlug: string }>).detail?.projectSlug === projectSlug) void load();
    };
    window.addEventListener("khesht-documents-changed",refresh);window.addEventListener("khesht-case-changed",refresh);
    return()=>{window.removeEventListener("khesht-documents-changed",refresh);window.removeEventListener("khesht-case-changed",refresh);};
  }, [projectSlug]);

  const selected = useMemo(() => payload?.reports.find((report) => report.id === selectedId) ?? payload?.reports[0] ?? null, [payload?.reports, selectedId]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true); setMessage("");
    try {
      const response = await fetch("/api/sample-reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectSlug, title, scopeNote }) });
      const data = await response.json() as { report?: Report; error?: string };
      if (!response.ok || !data.report) throw new Error(data.error || "گزارش آزمایشی ساخته نشد.");
      setPayload((current) => current ? { ...current, reports: [data.report!, ...current.reports] } : current);
      window.dispatchEvent(new CustomEvent("khesht-case-changed",{detail:{projectSlug}}));
      setSelectedId(data.report.id); setTitle(""); setScopeNote("");
      setMessage("پیش‌نویس از متن‌های واقعاً استخراج‌شده ساخته شد و برای مرور انسانی آماده است.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "خطا در ساخت گزارش"); }
    finally { setCreating(false); }
  }

  if (loading) return <section className="sample-report-studio loading"><LoaderCircle className="spin" size={19} /> در حال بررسی منابع خوانده‌شده…</section>;
  if (!payload) return <section className="sample-report-studio error"><AlertTriangle size={19} /> {message || "استودیوی گزارش در دسترس نیست."}</section>;

  return <section className="sample-report-studio" aria-labelledby="sample-report-title">
    <div className="report-studio-head">
      <div><span className="mini-label"><FileOutput size={14} /> خروجی کنترل‌شده</span><h2 id="sample-report-title">گزارش کارشناسی آزمایشی</h2><p>فقط متنِ اسنادی که استخراج آن‌ها کامل شده در این پیش‌نویس به‌کار می‌رود. فایل خام و متن خوانده‌شده دو رکورد مجزا هستند.</p></div>
      <button type="button" className="icon-text-link" onClick={() => void load()}><RefreshCw size={14} /> به‌روزرسانی منابع</button>
    </div>

    <div className="report-source-meter">
      <div><BookOpenCheck size={19} /><span><strong>{payload.sources.length.toLocaleString("fa-IR")}</strong> منبعِ خوانده‌شدهٔ قابل استفاده</span></div>
      <p>PDFهای در انتظار یا ناموفق، «منبع اعمال‌شده» نیستند و در این شمارش دیده نمی‌شوند.</p>
    </div>

    {payload.permissions.canGenerate ? <form className="report-create-form" onSubmit={create}>
      <div className="operational-title"><div><span className="mini-label">پیش‌نویس جدید</span><h3>از منابع خوانده‌شده خروجی بگیر</h3></div><Sparkles size={19} /></div>
      <label><span>عنوان (اختیاری)</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="مثلاً: مرور اولیهٔ وضعیت پرونده" /></label>
      <label><span>دامنهٔ مرور و یادداشت کارشناس</span><textarea value={scopeNote} onChange={(event) => setScopeNote(event.target.value)} maxLength={1400} placeholder="آنچه باید در این پیش‌نویس مرور شود را بنویسید…" /></label>
      <button className="button button-red button-small" disabled={creating || !payload.sources.length} type="submit"><FileOutput size={15} /> {creating ? "در حال ساخت…" : "ساخت گزارش آزمایشی"}</button>
      {!payload.sources.length && <p className="form-note">ابتدا یک PDF متن‌دار بارگذاری کنید یا متن خوانده‌شدهٔ یک سند را ثبت کنید.</p>}
    </form> : <div className="report-access-note"><ShieldCheck size={18} /> برای ایجاد پیش‌نویس، نقش کارشناس، بازبین مستقل یا مدیر لازم است.</div>}

    {payload.sources.length > 0 && <div className="report-sources" aria-label="منابع خوانده‌شده">
      {payload.sources.map((source) => <article key={source.id}><FileText size={17} /><div><strong>{source.title}</strong><small>{source.category} · {sourceKindLabels[source.sourceKind] ?? source.sourceKind} · {extractCount(source.characterCount)}{source.pageCount ? ` · ${source.pageCount.toLocaleString("fa-IR")} صفحه` : ""}</small></div><span className={`review-chip ${source.reviewStatus}`}>{reviewLabels[source.reviewStatus] ?? source.reviewStatus}</span></article>)}
    </div>}

    {payload.reports.length > 0 && <div className="report-output-area">
      <div className="report-history" aria-label="پیش‌نویس‌های پیشین">{payload.reports.map((report) => <button type="button" className={report.id === selected?.id ? "active" : ""} key={report.id} onClick={() => setSelectedId(report.id)}><span>{report.isCurrent?"پیش‌نویس جاری":"نیازمند تولید مجدد"}</span><b>{report.title}</b><small>{date(report.generatedAt)}</small></button>)}</div>
      {selected && <article className="sample-report-preview">
        <header><div><span className="mini-label">پیش‌نویس غیررسمی</span><h3>{selected.title}</h3><p>{date(selected.generatedAt)} · {selected.sourceDocumentIds.length.toLocaleString("fa-IR")} منبعِ خوانده‌شده</p></div><div><a className="button button-ghost button-small" href={`/api/sample-reports?project=${encodeURIComponent(projectSlug)}&download=${selected.id}`}>دریافت دادهٔ گزارش</a><button type="button" className="button button-ghost button-small" onClick={() => window.print()}>چاپ صفحه</button></div></header>
        {selected.isCurrent===false&&<p className="extraction-warning" role="status">شواهد یا برنامه تغییر کرده است؛ این نسخه تاریخی است و برای عبور مرحله معتبر نیست.</p>}
        <div className="sample-report-scope"><strong>دامنهٔ مرور</strong><p>{selected.scopeNote}</p></div>
        {selected.content ? <>
          {selected.content.projectSummary && <section className="sample-report-scope"><strong>مشخصات ثبت‌شدهٔ پرونده</strong><p>{selected.content.projectSummary.description}</p><p>{selected.content.projectSummary.location} · افق {selected.content.projectSummary.horizonMonths} ماه</p><p>{selected.content.projectSummary.outcome}</p>{selected.content.projectSummary.risks.map(r=><article key={r.title}><b>{r.title}</b><p>محرک: {r.trigger} · پاسخ: {r.response}</p></article>)}<small>منبع این بخش: اطلاعات واردشده توسط تیم پرونده؛ مستقل از متن اسناد.</small></section>}
          {selected.content.financialScenario && <section className="sample-report-scope"><strong>تحلیل مالی ثبت‌شده در این نسخهٔ گزارش: {selected.content.financialScenario.name}</strong><div className="finance-scenario-grid">{selected.content.financialScenario.results.map(r=><div key={r.key}><b>{r.label}</b><p>بازده فرضی: {r.roiPercent.toLocaleString("fa-IR",{maximumFractionDigits:2})}٪</p><p>سود / زیان پروژه: {Math.round(r.profit).toLocaleString("fa-IR")} تومان</p></div>)}</div><small>منبع: ورودی‌های سناریوی آزمایشی؛ سند کارشناسی نیست.</small></section>}
          <div className="report-conclusion"><Sparkles size={18} /><p>{selected.content.conclusion}</p></div>
          <div className="report-preview-grid">
            <section><h4>شواهدِ به‌کاررفته</h4>{selected.content.evidence.map((item) => <article key={item.documentId}><div><b>{item.title}</b><small>{item.category} · {reviewLabels[item.reviewStatus] ?? item.reviewStatus}</small></div><p>{item.excerpt || "متن قابل‌نمایش در این منبع ثبت نشده است."}</p></article>)}</section>
            <section><h4>کنترل و محدودیت</h4>{selected.content.controls.map((item) => <article key={item.title}><b>{item.title}</b><p>{item.detail}</p></article>)}<ul>{selected.content.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section>
          </div>
        </> : <p className="form-note">ساختار این پیش‌نویس قابل بازیابی نیست؛ یک پیش‌نویس تازه از منابع خوانده‌شده بسازید.</p>}
        <footer><AlertTriangle size={15} /> گزارش نمونه، کارشناسی رسمی واقعی یا ارزش‌گذاری رسمی نیست و هیچ قیمت مصوب، پرداخت، عرضهٔ عمومی، سفارش، تخصیص یا صدور توکن ایجاد نمی‌کند.</footer>
      </article>}
    </div>}
    {message && <p className="operational-message" role="status"><ShieldCheck size={15} /> {message}</p>}
  </section>;
}
