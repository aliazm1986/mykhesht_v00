"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, LoaderCircle, ShieldCheck, Smartphone } from "lucide-react";

type Step = "mobile" | "otp" | "profile";

async function api(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json() as { ok: boolean; data?: Record<string, unknown>; error?: string };
  if (!response.ok || !result.ok) throw new Error(result.error ?? "خطا در ارتباط با نسخهٔ نمایشی");
  return result.data ?? {};
}

export function AuthFlow() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("۰۹۱۲۰۰۰۰۰۰۰");
  const [code, setCode] = useState("");
  const [profile, setProfile] = useState({ firstName: "", lastName: "", nationalId: "", email: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitMobile = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      await api("/api/auth/send-otp", { mobile });
      setNotice("کد آزمایشی برای این MVP: ۱۲۳۴۵۶");
      setStep("otp");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "خطا در ارسال کد"); }
    finally { setLoading(false); }
  };

  const submitOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      await api("/api/auth/verify-otp", { mobile, code });
      window.localStorage.setItem("khisht-demo-session", "khisht-demo-token");
      if (mode === "login") router.push("/dashboard");
      else { setNotice("شمارهٔ همراه تأیید شد. اطلاعات پایه را کامل کنید."); setStep("profile"); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "کد صحیح نیست"); }
    finally { setLoading(false); }
  };

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      await api("/api/auth/register", { mobile, ...profile });
      router.push("/kyc");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ثبت‌نام انجام نشد"); }
    finally { setLoading(false); }
  };

  return (
    <section className="auth-card">
      <div className="auth-switch" role="tablist" aria-label="نوع ورود">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setStep("mobile"); }}>ورود</button>
        <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setStep("mobile"); }}>ثبت‌نام</button>
      </div>
      <div className="auth-card-head">
        <span className="auth-icon">{step === "mobile" ? <Smartphone size={22} /> : step === "otp" ? <KeyRound size={22} /> : <ShieldCheck size={22} />}</span>
        <div>
          <span className="mini-label">ورود امن </span>
          <h2>{step === "mobile" ? (mode === "login" ? "به خشت برگردید" : "حساب خشت خود را بسازید") : step === "otp" ? "کد تأیید را وارد کنید" : "اطلاعات پایه"}</h2>
        </div>
      </div>
      {step === "mobile" && <form onSubmit={submitMobile} className="mvp-form"><label><span>شماره همراه</span><input value={mobile} onChange={(event) => setMobile(event.target.value)} inputMode="tel" placeholder="۰۹۱۲۱۲۳۴۵۶۷" autoFocus /></label><p className="field-help">کد تأیید فقط برای تست جریان MVP ارسال می‌شود.</p><button className="button button-red button-wide" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <>دریافت کد <ArrowLeft size={16} /></>}</button></form>}
      {step === "otp" && <form onSubmit={submitOtp} className="mvp-form"><label><span>کد ۶ رقمی</span><input className="otp-input" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="۱۲۳۴۵۶" autoFocus /></label><p className="demo-code"><CheckCircle2 size={15} /> {notice || "برای تست از کد ۱۲۳۴۵۶ استفاده کنید."}</p><button className="button button-red button-wide" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <>تأیید و ادامه <ArrowLeft size={16} /></>}</button><button type="button" className="text-button" onClick={() => setStep("mobile")}>ویرایش شماره همراه</button></form>}
      {step === "profile" && <form onSubmit={submitProfile} className="mvp-form"><div className="form-grid-two"><label><span>نام</span><input required value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} /></label><label><span>نام خانوادگی</span><input required value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} /></label></div><label><span>کد ملی</span><input required inputMode="numeric" value={profile.nationalId} onChange={(event) => setProfile({ ...profile, nationalId: event.target.value })} /></label><label><span>ایمیل</span><input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label><button className="button button-red button-wide" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <>تکمیل ثبت‌نام <ArrowLeft size={16} /></>}</button></form>}
      {error && <p className="form-message error">{error}</p>}
      <p className="auth-legal">در MVP، ورود فقط یک تعامل نمایشی است و هیچ دادهٔ بانکی یا هویتی واقعی ارسال نمی‌شود.</p>
    </section>
  );
}
