"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, FileCheck2, ShieldAlert, ShoppingCart } from "lucide-react";
import type { Property } from "@/lib/data";
import { formatToman } from "@/lib/data";
import { readJson } from "@/lib/api-client";

type Step = 1 | 2 | 3;

export function InvestmentRequestForm({ property }: { property: Property }) {
  const unitPrice = property.tokenPriceCurrent || property.tokenPriceInitial || 500_000;
  const [step, setStep] = useState<Step>(1);
  const [shares, setShares] = useState(10);
  const [checks, setChecks] = useState({ documents: false, risks: false, pilot: false });
  const [receipt, setReceipt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allChecks = Object.values(checks).every(Boolean);

  async function confirmPurchase() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/market", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "primary_buy", projectSlug: property.slug, shares }),
      });
      if (r.status === 401) {
        window.location.assign("/auth");
        return;
      }
      const d = await readJson<{ tradeId?: string; message?: string; error?: string }>(r);
      if (!r.ok) throw new Error(d.error || "خطا در ثبت خرید سهام");
      setReceipt(d.tradeId ? `KH-${d.tradeId.slice(0, 8).toUpperCase()}` : `KH-${property.slug.slice(0, 4).toUpperCase()}-1405`);
      window.dispatchEvent(new CustomEvent("khesht:market-updated"));
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="investment-flow">
      <div className="flow-steps">
        {["انتخاب تعداد سهام", "تأیید ضوابط و ریسک", "گواهی خرید سهام"].map((item, index) => (
          <div key={item} className={step >= index + 1 ? "active" : ""}>
            <span>{index + 1}</span>
            <small>{item}</small>
          </div>
        ))}
      </div>
      {step === 1 && (
        <div className="flow-panel">
          <span className="mini-label">گام ۱ از ۳</span>
          <h2>تعیین تعداد سهام سرمایه‌گذاری</h2>
          <p>تعداد سهام مورد نظر خود را برای خرید از عرضهٔ پروژه مشخص کنید.</p>
          <div className="order-summary">
            <div>
              <span>پروژه</span>
              <strong>{property.name}</strong>
            </div>
            <div>
              <span>نماد معاملاتی</span>
              <strong>{property.tokenSymbol || `KH-${property.slug.toUpperCase()}`}</strong>
            </div>
            <div>
              <span>قیمت هر سهم</span>
              <strong>{formatToman(unitPrice)} تومان</strong>
            </div>
          </div>
          <label className="form-field" style={{ marginBottom: 16 }}>
            <span>تعداد سهام درخواستی</span>
            <input
              type="number"
              min={1}
              max={100000}
              value={shares}
              onChange={(e) => setShares(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
          <p style={{ fontWeight: 800, marginBottom: 16 }}>
            مبلغ قابل کسر از کیف پول: {formatToman(shares * unitPrice)} تومان
          </p>
          <button className="button button-red" onClick={() => setStep(2)}>
            ادامه و بررسی ضوابط <ArrowLeft size={16} />
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="flow-panel">
          <span className="mini-label">گام ۲ از ۳</span>
          <h2>تأیید آگاهانهٔ سرمایه‌گذاری</h2>
          <div className="risk-callout">
            <ShieldAlert size={19} />
            <p>
              با تأیید این مرحله، مبلغ {formatToman(shares * unitPrice)} تومان از کیف پول شما کسر شده و {formatToman(shares)}{" "}
              سهم از پروژهٔ {property.name} در داشبورد و پرتفوی شما ثبت می‌گردد.
            </p>
          </div>
          <div className="check-list">
            <label>
              <input
                type="checkbox"
                checked={checks.documents}
                onChange={(event) => setChecks({ ...checks, documents: event.target.checked })}
              />
              <span>اسناد و گزارش‌های اتاق دادهٔ پروژه را بررسی کرده‌ام.</span>
              <Link href={`/projects/${property.slug}/documents`}>اتاق داده</Link>
            </label>
            <label>
              <input
                type="checkbox"
                checked={checks.risks}
                onChange={(event) => setChecks({ ...checks, risks: event.target.checked })}
              />
              <span>سناریوهای سود و افق زمانی پروژه را مطالعه کرده‌ام.</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={checks.pilot}
                onChange={(event) => setChecks({ ...checks, pilot: event.target.checked })}
              />
              <span>ضوابط معاملات در بازار اولیه و بازار ثانویهٔ خشت را می‌پذیرم.</span>
            </label>
          </div>
          {error && <p className="sim-error">{error}</p>}
          <div className="flow-actions">
            <button className="button button-ghost" onClick={() => setStep(1)}>
              بازگشت
            </button>
            <button className="button button-red" disabled={!allChecks || busy} onClick={() => void confirmPurchase()}>
              <ShoppingCart size={16} /> {busy ? "در حال ثبت خرید…" : `تأیید و خرید ${formatToman(shares)} سهم`}
            </button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="success-state compact">
          <span className="success-icon">
            <CheckCircle2 size={28} />
          </span>
          <span className="mini-label">گام ۳ از ۳</span>
          <h2>خرید سهام با موفقیت ثبت شد</h2>
          <p>
            گواهی خرید شمارهٔ <strong>{receipt}</strong> برای <strong>{formatToman(shares)} سهم</strong> از پروژهٔ{" "}
            {property.name} صادر شد و هم‌اکنون در داشبورد، پرتفوی و بازار ثانویه قابل مدیریت و معامله است.
          </p>
          <div className="flow-actions">
            <Link href="/dashboard" className="button button-red">
              <FileCheck2 size={16} /> مشاهده در داشبورد من
            </Link>
            <Link href={`/market/${property.slug}`} className="button button-ghost">
              تابلوی بازار ثانویه
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
