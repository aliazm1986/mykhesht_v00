"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, CircleAlert, ClipboardCheck, FileClock, FileSearch2, FileUp, FolderLock, ListChecks, LoaderCircle, ScanText, ShieldCheck, TextCursorInput, UploadCloud } from "lucide-react";
import {CaseEvidenceStudio} from "./CaseEvidenceStudio";
import { extractDocumentText } from "@/lib/browser-extraction";

type StageState = "pending" | "active" | "passed" | "blocked";
type AccessLevel = "project_team" | "reviewer" | "admin";
type ReviewOutcome = "pending" | "approved" | "needs_revision" | "rejected";

type Stage = { id: string; stageKey: string; state: StageState; responsibleRole: string; decisionReason: string; updatedAt: number };
type Extraction = { state: "pending" | "complete" | "failed" | "needs_review"; sourceKind: string; characterCount: number; pageCount: number | null; failureReason: string | null; updatedAt: number | null };
type Document = {revision:number; id: string; title: string; category: string; originalFilename: string; mimeType: string; sizeBytes: number; checksumSha256: string; accessLevel: AccessLevel; extractionStatus: string; reviewStatus: ReviewOutcome; uploadedAt: number; reviewedAt: number | null; extraction: Extraction };
type Payload = { actor: { displayName: string; role: string }; permissions: { canManageDataRoom: boolean; canReviewDocuments: boolean; canManageStages: boolean }; projectCase: { id: string; title: string; revision:number }; stages: Stage[]; documents: Document[] };

const stageLabels: Record<string, string> = {
  intake: "پذیرش پروژه", data_room: "اتاق داده", investment_plan: "برنامهٔ پروژه", sample_report: "گزارش کارشناسی آزمایشی", value_bridge: "پل ارزش", independent_review: "تأیید مستقل", closed_pilot_register: "ثبت پایلوت بسته", scenario_log: "ثبت سناریوی آزمایشی", financial_report: "گزارش مالی نمونه",
};
const stageRoles:Record<string,string>={intake:"project_manager",data_room:"expert",investment_plan:"project_manager",sample_report:"expert",value_bridge:"expert",independent_review:"independent_reviewer",closed_pilot_register:"project_manager",scenario_log:"expert",financial_report:"project_manager"};
const stateLabels: Record<StageState, string> = { pending: "در انتظار", active: "فعال", passed: "عبور مشروط", blocked: "متوقف" };
const reviewLabels: Record<ReviewOutcome, string> = { pending: "در انتظار بازبینی", approved: "بازبینی شد", needs_revision: "نیازمند اصلاح", rejected: "رد شده" };
const accessLabels: Record<AccessLevel, string> = { project_team: "تیم پرونده", reviewer: "بازبین‌ها", admin: "فقط مدیر" };
const roleLabels: Record<string, string> = { viewer: "بازدیدکننده", investor: "عضو پایلوت", expert: "کارشناس", project_manager: "مدیر پرونده", independent_reviewer: "بازبین مستقل", admin: "مدیر" };
const extractionLabels: Record<Extraction["state"], string> = { pending: "خوانده نشده", complete: "متن آماده", failed: "استخراج ناموفق", needs_review: "OCR در انتظار تأیید متن" };

function date(value: number | null) {
  return value ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
}

function size(value: number) {
  return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} کیلوبایت` : `${(value / (1024 * 1024)).toFixed(1)} مگابایت`;
}

export function DataRoomOperations({ projectSlug }: { projectSlug: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewOutcome, setReviewOutcome] = useState<Exclude<ReviewOutcome, "pending">>("approved");
  const [editingExtractionId, setEditingExtractionId] = useState<string | null>(null);
  const [manualTexts, setManualTexts] = useState<Record<string, string>>({});
  const [savingExtractionId, setSavingExtractionId] = useState<string | null>(null);
  const [selectedStageKey, setSelectedStageKey] = useState("");
  const [stageState, setStageState] = useState<StageState>("active");
  const [stageRole, setStageRole] = useState("project_manager");
  const [stageReason, setStageReason] = useState("");
  const [savingStage, setSavingStage] = useState(false);
  const [reopenDownstream,setReopenDownstream]=useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data-room/documents?project=${encodeURIComponent(projectSlug)}`, { cache: "no-store" });
      const data = await response.json() as Payload & { error?: string };
      if (!response.ok) throw new Error(data.error || "اطلاعات اتاق داده دریافت نشد.");
      setPayload(data);
      const current = data.stages.find((stage) => stage.state === "active") ?? data.stages.find(s=>s.state!=="passed") ?? data.stages.at(-1);
      if (current) {
        setSelectedStageKey(current.stageKey);
        setStageState(current.state);
        setStageRole(stageRoles[current.stageKey]);
        setStageReason("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "خطا در دریافت اتاق داده");
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{void load();const refresh=(e:Event)=>{if((e as CustomEvent).detail?.projectSlug===projectSlug)void load();};window.addEventListener("khesht-case-changed",refresh);return()=>window.removeEventListener("khesht-case-changed",refresh);},[projectSlug]);

  const selectedStage = useMemo(() => payload?.stages.find((stage) => stage.stageKey === selectedStageKey), [payload?.stages, selectedStageKey]);

  const chooseStage = (stageKey: string) => {
    const stage = payload?.stages.find((item) => item.stageKey === stageKey);
    setSelectedStageKey(stageKey);
    if (stage) { setStageState(stage.state); setStageRole(stageRoles[stage.stageKey]); setStageReason(""); setReopenDownstream(false); }
  };

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("projectSlug", projectSlug);
    setUploading(true); setMessage("");
    try {
      const file = form.get("file");
      if (!(file instanceof File) || !file.size || file.size > 15 * 1024 * 1024) throw new Error("یک فایل با حجم حداکثر ۱۵ مگابایت انتخاب کنید.");
      const manualText = typeof form.get("manualExtractedText") === "string" ? String(form.get("manualExtractedText")).trim() : "";
      if (manualText) {
        form.set("extractedText", manualText);
        form.set("extractionSourceKind", "manual_entry");
      } else {
        setMessage("در حال بررسی استخراج متن روی دستگاه شما…");
        try {
          const extracted = await extractDocumentText(file, setMessage);
          if (extracted?.text) {
            form.set("extractedText", extracted.text);
            form.set("extractionSourceKind", extracted.sourceKind);
            form.set("extractionPageCount", String(extracted.pageCount));
            form.set("extractionEvidence", JSON.stringify(extracted.evidence));
          }
        } catch (error) {
          form.set("extractionFailure", error instanceof Error ? error.message.slice(0, 500) : "استخراج خودکار متن در مرورگر کامل نشد؛ فایل خام ثبت می‌شود اما تا ورود متن، در گزارش به‌کار نمی‌رود.");
        }
      }
      const response = await fetch("/api/data-room/documents", { method: "POST", body: form });
      const data = await response.json() as { document?: Document; error?: string };
      if (!response.ok || !data.document) throw new Error(data.error || "بارگذاری سند کامل نشد.");
      setPayload((current) => current ? { ...current, documents: [data.document!, ...current.documents] } : current);
      formElement.reset(); await load();
      window.dispatchEvent(new CustomEvent("khesht-documents-changed", { detail: { projectSlug } }));
      setMessage(data.document.extraction.state === "needs_review" ? "متن OCR ذخیره شد؛ پیش از استفاده در گزارش، متن را با فایل اصلی تطبیق دهید و تأیید کنید." : data.document.extraction.state === "complete" ? "فایل خام و متنِ استخراج‌شده جداگانه ثبت شدند؛ متن برای گزارش آزمایشی قابل استفاده است اما هنوز نیاز به بازبینی انسانی دارد." : data.document.extraction.state === "failed" ? "فایل خام ذخیره شد، اما متن خوانده نشد و در گزارش به‌کار نخواهد رفت." : "فایل خام ذخیره شد و تا زمانی که متنِ خوانده‌شده ثبت نشود، در گزارش به‌کار نمی‌رود.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "خطا در بارگذاری سند"); }
    finally { setUploading(false); }
  }

  async function openExtraction(document: Document) {
    if (editingExtractionId === document.id) { setEditingExtractionId(null); return; }
    try {
      const response = await fetch(`/api/data-room/documents/${document.id}/extraction`, { cache: "no-store" });
      const data = await response.json() as { textContent?: string | null; error?: string };
      if (!response.ok) throw new Error(data.error || "متن دریافت نشد.");
      setManualTexts((current) => ({ ...current, [document.id]: data.textContent ?? "" }));
      setEditingExtractionId(document.id);
    } catch (error) { setMessage(error instanceof Error ? error.message : "متن دریافت نشد."); }
  }

  async function saveManualExtraction(document: Document) {
    const textContent = manualTexts[document.id]?.trim() ?? "";
    if (textContent.length < 2) { setMessage("برای ثبت متن خوانده‌شده، دست‌کم دو نویسه وارد کنید."); return; }
    setSavingExtractionId(document.id); setMessage("");
    try {
      const response = await fetch(`/api/data-room/documents/${document.id}/extraction`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({textContent,revision:document.revision,confirmOcr: document.extraction.sourceKind.startsWith("browser_ocr") || document.extraction.sourceKind === "ocr_human_confirmed" }) });
      const data = await response.json() as { state?: Extraction["state"]; sourceKind?: string; characterCount?: number; pageCount?: number | null; updatedAt?: number; error?: string };
      if (!response.ok || data.state !== "complete") throw new Error(data.error || "متن خوانده‌شده ثبت نشد.");
      setPayload((current) => current ? { ...current, documents: current.documents.map((item) => item.id === document.id ? { ...item, extractionStatus: "complete", reviewStatus: "pending", reviewedAt: null, extraction: { state: "complete", sourceKind: data.sourceKind ?? "manual_entry", characterCount: data.characterCount ?? textContent.length, pageCount: data.pageCount ?? null, failureReason: null, updatedAt: data.updatedAt ?? Date.now() } } : item) } : current);
      await load();
      setManualTexts((current) => ({ ...current, [document.id]: "" })); setEditingExtractionId(null);
      window.dispatchEvent(new CustomEvent("khesht-documents-changed", { detail: { projectSlug } }));
      setMessage("متن خوانده‌شده جدا از فایل خام ثبت شد؛ اکنون فقط همین متن می‌تواند در گزارش آزمایشی به‌کار رود.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "خطا در ثبت متن خوانده‌شده"); }
    finally { setSavingExtractionId(null); }
  }

  async function review(document: Document) {
    if (reviewNote.trim().length < 2) { setMessage("برای ثبت بازبینی، یک توضیح کوتاه بنویسید."); return; }
    setMessage("");
    try {
      const response = await fetch(`/api/data-room/documents/${document.id}/review`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({outcome:reviewOutcome,note:reviewNote,revision:document.revision}) });
      const data = await response.json() as { reviewStatus?: ReviewOutcome; reviewedAt?: number; error?: string };
      if (!response.ok || !data.reviewStatus) throw new Error(data.error || "بازبینی ثبت نشد.");
      setPayload((current) => current ? { ...current, documents: current.documents.map((item) => item.id === document.id ? { ...item, reviewStatus: data.reviewStatus!, reviewedAt: data.reviewedAt ?? Date.now() } : item) } : current);
      await load();window.dispatchEvent(new CustomEvent("khesht-documents-changed",{detail:{projectSlug}}));
      setReviewingId(null); setReviewNote("");
      setMessage("نتیجهٔ بازبینی و سابقهٔ آن در پرونده ثبت شد.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "خطا در بازبینی سند"); }
  }

  async function saveStage(event: FormEvent) {
    event.preventDefault();
    if (stageReason.trim().length < 10) { setMessage("علت تصمیم مرحله را ثبت کنید."); return; }
    setSavingStage(true); setMessage("");
    try {
      const response = await fetch("/api/project-control/stages", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({projectSlug,stageKey:selectedStageKey,state:stageState,responsibleRole:stageRole,decisionReason:stageReason,revision:payload?.projectCase.revision,reopenDownstream}) });
      const data = await response.json() as { stage?: Stage; error?: string };
      if (!response.ok || !data.stage) throw new Error(data.error || "تصمیم مرحله ثبت نشد.");
      setPayload((current) => current ? { ...current, stages: current.stages.map((stage) => stage.stageKey === data.stage!.stageKey ? data.stage! : stage) } : current);
      await load();setReopenDownstream(false);setMessage("تصمیم با کنترل پیش‌نیازها و نسخهٔ پرونده ثبت شد.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "خطا در ثبت تصمیم"); }
    finally { setSavingStage(false); }
  }

  if (loading) return <section className="operational-room loading"><LoaderCircle size={20} className="spin" /> در حال بازیابی اتاق دادهٔ عملیاتی…</section>;
  if (!payload) return <section className="operational-room error"><CircleAlert size={20} /> {message || "اتاق داده در دسترس نیست."}</section>;

  return <section className="operational-room" aria-labelledby="operational-room-title">
    <div className="operational-room-head">
      <div><span className="mini-label"><FolderLock size={14} /> اتاق دادهٔ عملیاتی</span><h2 id="operational-room-title">سند، کنترل و سابقهٔ قابل پیگیری</h2><p>هر فایل در R2 خصوصی نگهداری می‌شود و متادیتا، بازبینی و تصمیم‌های مرحله‌ای در D1 ثبت می‌گردند.</p></div>
      <div className="actor-chip"><ShieldCheck size={16} /><span>{payload.actor.displayName}<small>{roleLabels[payload.actor.role] ?? payload.actor.role}</small></span></div>
    </div>

    <div className="stage-rail" aria-label="مراحل پرونده">
      {payload.stages.map((stage, index) => <button key={stage.id} type="button" className={`stage-node ${stage.state} ${selectedStageKey === stage.stageKey ? "selected" : ""}`} onClick={() => chooseStage(stage.stageKey)}>
        <span>{index + 1}</span><b>{stageLabels[stage.stageKey] ?? stage.stageKey}</b><small>{stateLabels[stage.state]}</small>
      </button>)}
    </div>

    {(payload.permissions.canManageDataRoom||payload.permissions.canReviewDocuments||payload.permissions.canManageStages)&&<CaseEvidenceStudio projectSlug={projectSlug}/>}
    <div className="operational-grid">
      <section className="operational-card live-documents">
        <div className="operational-title"><div><span className="mini-label">رکوردهای واقعی این نسخه</span><h3>فایل‌های ثبت‌شده</h3></div><FileClock size={19} /></div>
        {!payload.documents.length ? <div className="operational-empty"><FileUp size={25} /><strong>هنوز فایلی در اتاق دادهٔ عملیاتی ثبت نشده است.</strong><p>اسناد نمایشی بالاتر، جدا از این رکوردهای خصوصی هستند.</p></div> : <div className="operational-document-list">{payload.documents.map((document) => <article key={document.id}>
          <div className="live-document-head"><div><b>{document.title}</b><small>{document.category} · {size(document.sizeBytes)} · {date(document.uploadedAt)}</small></div><span className={`review-chip ${document.reviewStatus}`}>{reviewLabels[document.reviewStatus]}</span></div>
          <div className="live-document-meta"><span>{accessLabels[document.accessLevel]}</span><span className={`extraction-chip ${document.extraction.state}`}><ScanText size={13} /> {extractionLabels[document.extraction.state]}{document.extraction.state === "complete" ? ` · ${document.extraction.characterCount.toLocaleString("fa-IR")} نویسه` : ""}</span><span title={document.checksumSha256}>SHA-256: {document.checksumSha256.slice(0, 12)}…</span></div>
          {document.extraction.state === "failed" && <p className="extraction-warning"><CircleAlert size={13} /> {document.extraction.failureReason || "متن این فایل هنوز قابل استفاده نیست."}</p>}
          <div className="live-document-actions"><a className="icon-text-link" href={`/api/data-room/documents/${document.id}`}><UploadCloud size={14} /> دریافت فایل</a>{(payload.permissions.canManageDataRoom || payload.permissions.canReviewDocuments) && <button type="button" className="text-button" onClick={() => void openExtraction(document)}><TextCursorInput size={14} /> {document.extraction.state === "needs_review" ? "بررسی و تأیید متن OCR" : document.extraction.state === "complete" ? "مرور و اصلاح متن" : "ثبت متن خوانده‌شده"}</button>}{payload.permissions.canReviewDocuments && <button type="button" className="text-button" onClick={() => { setReviewingId(reviewingId === document.id ? null : document.id); setReviewNote(""); }}>ثبت بازبینی</button>}</div>
          {editingExtractionId === document.id && <div className="manual-extraction-form"><div><FileSearch2 size={16} /><span><b>متنِ خوانده‌شده را جدا ثبت کنید</b><small>فایل خام بدون این متن، به‌عنوان منبع گزارش اعمال نمی‌شود.</small></span></div><textarea value={manualTexts[document.id] ?? ""} onChange={(event) => setManualTexts((current) => ({ ...current, [document.id]: event.target.value }))} maxLength={120000} placeholder="متنی که از سند خوانده یا با OCR استخراج شده را اینجا وارد کنید…" /><button type="button" className="button button-ghost button-small" disabled={savingExtractionId === document.id} onClick={() => void saveManualExtraction(document)}>{savingExtractionId === document.id ? "در حال ثبت…" : document.extraction.state === "needs_review" ? "متن را با اصل سند تطبیق دادم؛ تأیید" : "ثبت متن جداگانه"}</button></div>}
          {reviewingId === document.id && <div className="review-form"><select value={reviewOutcome} onChange={(event) => setReviewOutcome(event.target.value as Exclude<ReviewOutcome, "pending">)}><option value="approved">تأیید بازبینی</option><option value="needs_revision">نیازمند اصلاح</option><option value="rejected">رد بازبینی</option></select><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} minLength={2} maxLength={1000} placeholder="مبنای انسانی این نتیجه را بنویسید…" /><button type="button" className="button button-red button-small" onClick={() => void review(document)}>ثبت نتیجه</button></div>}
        </article>)}</div>}
      </section>

      <aside className="operational-side">
        {payload.permissions.canManageDataRoom ? <form className="operational-card upload-form" onSubmit={upload}>
          <div className="operational-title"><div><span className="mini-label">بارگذاری کنترل‌شده</span><h3>افزودن سند خام</h3></div><FileUp size={19} /></div>
          <label><span>عنوان سند</span><input name="title" required minLength={2} maxLength={160} placeholder="مثلاً: تصویر سند مالکیت" /></label>
          <label><span>دسته</span><select name="category" defaultValue="اسناد حقوقی"><option>خلاصه پروژه</option><option>اسناد فنی</option><option>اسناد حقوقی</option><option>اسناد مالی</option><option>گزارش پیشرفت</option><option>ضمائم</option><option>دیگر</option></select></label>
          <label><span>سطح دسترسی</span><select name="accessLevel" defaultValue="project_team"><option value="project_team">تیم پرونده</option><option value="reviewer">بازبین‌ها</option><option value="admin">فقط مدیر</option></select></label>
          <label className="file-input"><span>فایل (حداکثر ۱۵ مگابایت)</span><input name="file" type="file" accept="application/pdf,.pdf,.doc,.docx,.txt,.xlsx,.xls,.png,.jpg,.jpeg" required /></label>
          <label className="optional-text"><span>متنِ خوانده‌شده (اختیاری)</span><textarea name="manualExtractedText" maxLength={120000} placeholder="در صورت نیاز، متن خوانده‌شده را دستی وارد کنید…" /><small>PDF متن‌دار خوانده می‌شود؛ PDF اسکن‌شده و تصویر با OCR فارسی و انگلیسی روی دستگاه شما پردازش می‌شوند. متن OCR تا تأیید انسانی وارد گزارش نمی‌شود. حداکثر ۲۰ صفحهٔ اسکن‌شده در هر فایل.</small></label>
          <button className="button button-red button-small" disabled={uploading} type="submit"><UploadCloud size={15} /> {uploading ? "در حال ذخیره…" : "ثبت در اتاق داده"}</button>
        </form> : <section className="operational-card access-note"><FolderLock size={22} /><strong>دسترسی شما مشاهده‌ای است.</strong><p>بارگذاری، بازبینی و تغییر مرحله فقط با نقش‌های مشخص در کنترل دسترسی ممکن است.</p></section>}

        {payload.permissions.canManageStages && <form className="operational-card stage-form" onSubmit={saveStage}>
          <div className="operational-title"><div><span className="mini-label">ثبت تصمیم مرحله</span><h3>{selectedStage ? stageLabels[selectedStage.stageKey] : "انتخاب مرحله"}</h3></div><ListChecks size={19} /></div>
          <label><span>مرحله</span><select value={selectedStageKey} onChange={(event) => chooseStage(event.target.value)}>{payload.stages.map((stage) => <option value={stage.stageKey} key={stage.id}>{stageLabels[stage.stageKey]}</option>)}</select></label>
          <label><span>وضعیت</span><select value={stageState} onChange={(event) => setStageState(event.target.value as StageState)}><option value="pending">در انتظار</option><option value="active">فعال</option><option value="passed">عبور مشروط</option><option value="blocked">توقف</option></select></label>
          <label><span>نقش مسئول</span><select value={stageRole} disabled><option value={stageRole}>{roleLabels[stageRole]}</option></select></label>
          <label><span>علت و دامنهٔ تصمیم</span><textarea value={stageReason} onChange={(event) => setStageReason(event.target.value)} minLength={10} maxLength={800} required /></label>
          {selectedStage?.state==="passed"&&<label><span>بازگشایی، تأیید مراحل بعد را باطل می‌کند</span><input type="checkbox" checked={reopenDownstream} onChange={e=>setReopenDownstream(e.target.checked)}/></label>}
          <button className="button button-ghost button-small" disabled={savingStage} type="submit"><ClipboardCheck size={15} /> {savingStage ? "در حال ثبت…" : "ثبت تصمیم"}</button>
        </form>}
      </aside>
    </div>
    {message && <p className="operational-message" role="status"><CheckCircle2 size={15} /> {message}</p>}
    <p className="operational-disclaimer">فایل واقعی فقط پس از ورود و کنترل نقش قابل دریافت است. «گزارش کارشناسی آزمایشی» در این سامانه، کارشناسی رسمی واقعی محسوب نمی‌شود و هیچ تصمیم مرحله‌ای، قیمت مصوب، سفارش، پرداخت یا حق مالی ایجاد نمی‌کند.</p>
  </section>;
}
