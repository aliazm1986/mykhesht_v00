"use client";

import { ArrowLeft, Building2, CheckCircle2, CircleAlert, Percent } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCompactToman, formatToman } from "@/lib/data";

const onlyDigits = (value: string) => value.replace(/[^\d]/g, "");

export function FinancingSimulator() {
  const [projectCost, setProjectCost] = useState("25000000000");
  const [contribution, setContribution] = useState("5000000000");
  const [duration, setDuration] = useState("24");
  const [notice, setNotice] = useState("");
  const [sending,setSending]=useState(false);
  async function send(){
    setSending(true);
    try{
      const cost=Number(projectCost),equity=Number(contribution);
      if(!Number.isSafeInteger(cost)||cost<=0||!Number.isSafeInteger(equity)||equity<0||equity>cost)throw Error("هزینه و آورده را معتبر وارد کنید.");
      const r=await fetch("/api/support/tickets",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({subject:"بررسی اولیهٔ پروژهٔ سازنده",category:"پروژه‌ها",message:`سناریوی معرفی پروژه: هزینه ${cost} تومان؛ آورده ${equity} تومان؛ افق ${duration} ماه. درخواست بررسی اولیه در پایلوت بسته، بدون تعهد تأمین مالی.`})});
      const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||"درخواست ذخیره نشد.");
      setNotice("درخواست بررسی در پشتیبانی ثبت شد و از بخش تیکت‌ها قابل پیگیری است.");
    }catch(error){setNotice(error instanceof Error?error.message:"ثبت درخواست انجام نشد.");}finally{setSending(false);}
  }

  const result = useMemo(() => {
    const total = Math.max(Number(projectCost) || 0, 0);
    const equity = Math.max(Number(contribution) || 0, 0);
    const share = total ? (equity / total) * 100 : 0;
    const requested = Math.max(total - equity, 0);
    const eligible = total >= 5_000_000_000 && total <= 250_000_000_000 && share >= 15;
    return { share, requested, eligible };
  }, [projectCost, contribution]);

  return (
    <section className="finance-simulator" aria-labelledby="finance-simulator-title">
      <div className="calculator-head">
        <div>
          <span className="mini-label"><Building2 size={14} /> شبیه‌ساز تأمین مالی</span>
          <h2 id="finance-simulator-title">قبل از ارسال، تصویر پروژه را ببین.</h2>
        </div>
        <Percent size={21} color="var(--red)" />
      </div>
      <p className="calculator-intro">این فرم برای سنجش اولیهٔ یک پروژهٔ فرضی است و تعهد تأمین مالی ایجاد نمی‌کند.</p>
      <div className="calculator-inputs">
        <label className="tool-field">
          <span>کل هزینهٔ پروژه</span>
          <div className="tool-input-wrap"><input value={projectCost} onChange={(event) => setProjectCost(onlyDigits(event.target.value))} inputMode="numeric" /><small>تومان</small></div>
        </label>
        <label className="tool-field">
          <span>آوردهٔ سازنده</span>
          <div className="tool-input-wrap"><input value={contribution} onChange={(event) => setContribution(onlyDigits(event.target.value))} inputMode="numeric" /><small>تومان</small></div>
        </label>
      </div>
      <label className="tool-field finance-duration">
        <span>دورهٔ پیشنهادی پروژه</span>
        <select value={duration} onChange={(event) => setDuration(event.target.value)}>
          <option value="12">۱۲ ماه</option>
          <option value="24">۲۴ ماه</option>
          <option value="36">۳۶ ماه</option>
          <option value="48">۴۸ ماه</option>
        </select>
      </label>
      <div className="finance-summary">
        <div><span>مبلغ درخواستی</span><strong>{formatCompactToman(result.requested)}</strong></div>
        <div><span>نسبت آورده</span><strong>{formatToman(result.share)}٪</strong></div>
        <div><span>دورهٔ انتخابی</span><strong>{duration} ماه</strong></div>
      </div>
      <div className={`eligibility ${result.eligible ? "good" : "warn"}`}>
        {result.eligible ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
        <span>{result.eligible ? "در سناریوی نمونه، پروژه برای مرحلهٔ بررسی اولیه مناسب است." : "برای ورود به مرحلهٔ بررسی، مبلغ یا آوردهٔ پروژه را بازبینی کن."}</span>
      </div>
      <button type="button" className="button button-red button-wide" disabled={sending} onClick={() => void send()}>
        {sending?"در حال ثبت…":"ثبت درخواست بررسی اولیه"} <ArrowLeft size={16} />
      </button>
      {notice && <p className="sim-success"><CheckCircle2 size={14} /> {notice}</p>}
    </section>
  );
}
