"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert, FileUp, LoaderCircle, ShieldCheck } from "lucide-react";

type FormState = { nationalId: string; birthDate: string; iban: string; postalCode: string; address: string; cardFile: string; selfieFile: string; accepted: boolean };

const initial: FormState = { nationalId: "۰۰۱۲۳۴۵۶۷۸", birthDate: "۱۳۶۵/۰۸/۱۲", iban: "IR۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰", postalCode: "۱۴۳۵۸۱۳۷۶۵", address: "تهران، نشانی نمایشی برای تست جریان KYC", cardFile: "", selfieFile: "", accepted: false };

export function KycForm() {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<"needs_completion" | "in_review">("needs_completion");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (key: keyof FormState, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.accepted) { setError("پذیرش صحت اطلاعات و شرایط لازم است."); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/kyc/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "ثبت KYC ناموفق بود.");
      setStatus("in_review");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "خطای ناشناخته"); }
    finally { setLoading(false); }
  };

  if (status === "in_review") return <section className="success-state"><span className="success-icon"><CheckCircle2 size={28} /></span><span className="mini-label">KYC ثبت شد</span><h2>اطلاعات در صف بررسی قرار گرفت.</h2><p>وضعیت این فرآیند در MVP نمایشی است. پس از تأیید اپراتور، امکان ثبت درخواست سرمایه‌گذاری فعال می‌شود.</p><a href="/dashboard" className="button button-red">بازگشت به داشبورد</a></section>;

  return <form className="kyc-form" onSubmit={submit}>
    <div className="kyc-status-line"><span><CircleAlert size={16} /> وضعیت فعلی: نیازمند تکمیل</span><small>زمان بررسی در نسخهٔ عملیاتی توسط اپراتور مشخص می‌شود.</small></div>
    <div className="form-section"><div><span className="mini-label">۱ / هویت</span><h2>اطلاعات هویتی</h2></div><div className="form-grid-two"><label><span>کد ملی</span><input required inputMode="numeric" value={form.nationalId} onChange={(event) => update("nationalId", event.target.value)} /></label><label><span>تاریخ تولد</span><input required value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} placeholder="۱۳۶۵/۰۸/۱۲" /></label></div></div>
    <div className="form-section"><div><span className="mini-label">۲ / بانکی</span><h2>حساب تسویه</h2></div><div className="form-grid-two"><label><span>شماره شبا</span><input required value={form.iban} onChange={(event) => update("iban", event.target.value)} /></label><label><span>کدپستی</span><input required inputMode="numeric" value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} /></label></div><label><span>نشانی</span><textarea required value={form.address} onChange={(event) => update("address", event.target.value)} rows={3} /></label></div>
    <div className="form-section"><div><span className="mini-label">۳ / مدارک</span><h2>مدارک هویتی</h2></div><div className="upload-grid"><label className="upload-box"><FileUp size={20} /><strong>تصویر کارت ملی</strong><small>{form.cardFile || "فایل نمایشی انتخاب نشده"}</small><input type="file" accept="image/*" onChange={(event) => update("cardFile", event.target.files?.[0]?.name ?? "")} /></label><label className="upload-box"><FileUp size={20} /><strong>سلفی یا تطبیق چهره</strong><small>{form.selfieFile || "فایل نمایشی انتخاب نشده"}</small><input type="file" accept="image/*" onChange={(event) => update("selfieFile", event.target.files?.[0]?.name ?? "")} /></label></div></div>
    <label className="consent-check"><input type="checkbox" checked={form.accepted} onChange={(event) => update("accepted", event.target.checked)} /><span>صحت اطلاعات واردشده را تأیید می‌کنم و می‌دانم این صفحه فقط نسخهٔ نمایشی KYC است.</span></label>
    {error && <p className="form-message error">{error}</p>}
    <button className="button button-red" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <><ShieldCheck size={17} /> ثبت برای بررسی نمایشی</>}</button>
  </form>;
}
