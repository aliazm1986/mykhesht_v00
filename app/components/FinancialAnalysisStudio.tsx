"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, Coins, History, KeyRound, Save, TrendingUp } from "lucide-react";
import { properties, formatToman, formatCompactToman } from "@/lib/data";
import type { FinancialInput } from "@/lib/pilot-domain";

type Result = {
  key: string;
  label: string;
  months: number;
  equity: number;
  profit: number;
  netExit: number;
  roiPercent: number;
  annualizedPercent: number | null;
  investorProfit: number;
  investorFinalValue: number;
  debtInterest: number;
  rentalNet: number;
  rentalPaybackMonths: number | null;
};

type Run = {
  id: string;
  name: string;
  input: FinancialInput;
  results: Result[];
  createdAt: number;
};

const PRESET_AMOUNTS = [10_000_000, 50_000_000, 100_000_000, 250_000_000, 500_000_000];
const PRESET_MONTHS = [6, 12, 18, 24];

export function FinancialAnalysisStudio({
  projectSlug,
  horizonMonths,
}: {
  projectSlug: string;
  horizonMonths: number;
}) {
  const project = useMemo(
    () => properties.find((p) => p.slug === projectSlug) ?? properties[0],
    [projectSlug],
  );

  const unitPrice = project?.tokenPriceCurrent || project?.tokenPriceInitial || 500_000;
  const baseAnnualRate = project?.estimatedReturnBase || 27;
  const lowAnnualRate = project?.estimatedReturnLow || Math.max(15, baseAnnualRate - 8);
  const highAnnualRate = project?.estimatedReturnHigh || baseAnnualRate + 8;
  const annualRentYield = project?.rentalYield ?? 0;

  const [investorAmount, setInvestorAmount] = useState<number>(50_000_000);
  const [durationMonths, setDurationMonths] = useState<number>(horizonMonths || 12);
  const [selectedScenario, setSelectedScenario] = useState<"conservative" | "base" | "optimistic">("base");
  const [scenarioTitle, setScenarioTitle] = useState<string>(`محاسبهٔ سود من در ${project?.name ?? "پروژه"}`);
  const [runs, setRuns] = useState<Run[]>([]);
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(() => {
    fetch(`/api/analysis?project=${encodeURIComponent(projectSlug)}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return;
        const d = (await r.json()) as { runs?: Run[] };
        if (d.runs) setRuns(d.runs);
      })
      .catch(() => {});
  }, [projectSlug]);

  const calc = useMemo(() => {
    const shares = Math.max(1, Math.round(investorAmount / unitPrice));
    const effectiveAmount = shares * unitPrice;
    const yearsFactor = durationMonths / 12;

    const buildScenario = (key: "conservative" | "base" | "optimistic", label: string, annualCapPct: number, rentFactor: number) => {
      const capitalProfit = Math.round(effectiveAmount * (annualCapPct / 100) * yearsFactor);
      const rentalProfit =
        annualRentYield > 0
          ? Math.round(effectiveAmount * ((annualRentYield * rentFactor) / 100) * yearsFactor)
          : 0;
      const totalProfit = capitalProfit + rentalProfit;
      const finalValue = effectiveAmount + totalProfit;
      const totalRoiPct = Math.round((totalProfit / Math.max(1, effectiveAmount)) * 100);
      return {
        key,
        label,
        annualCapPct,
        capitalProfit,
        rentalProfit,
        totalProfit,
        finalValue,
        totalRoiPct,
      };
    };

    const conservative = buildScenario("conservative", "محافظه‌کارانه", lowAnnualRate, 0.85);
    const base = buildScenario("base", "سناریوی پایه (کارشناسی)", baseAnnualRate, 1.0);
    const optimistic = buildScenario("optimistic", "خوش‌بینانه", highAnnualRate, 1.15);

    const active =
      selectedScenario === "conservative"
        ? conservative
        : selectedScenario === "optimistic"
          ? optimistic
          : base;

    const principalPct = Math.round((effectiveAmount / Math.max(1, active.finalValue)) * 100);
    const capPct = Math.round((active.capitalProfit / Math.max(1, active.finalValue)) * 100);
    const rentPct = Math.max(0, 100 - principalPct - capPct);

    return {
      shares,
      effectiveAmount,
      active,
      scenarios: [conservative, base, optimistic],
      principalPct,
      capPct,
      rentPct,
    };
  }, [investorAmount, durationMonths, selectedScenario, unitPrice, lowAnnualRate, baseAnnualRate, highAnnualRate, annualRentYield]);

  async function saveCalculation() {
    setBusy(true);
    setMessage("");
    try {
      const valuation = project?.projectValuation || 40_000_000_000;
      const acqCost = Math.round(valuation * 0.72);
      const renoCost = Math.round(valuation * 0.18);
      const otherCost = Math.round(valuation * 0.03);
      const totalEquity = acqCost + renoCost + otherCost;
      const exitVal = Math.round(totalEquity * (1 + (baseAnnualRate / 100) * (durationMonths / 12)));
      const monthlyRent =
        annualRentYield > 0 ? Math.round((totalEquity * (annualRentYield / 100)) / 12) : 0;

      const payloadInput: FinancialInput = {
        acquisitionCost: acqCost,
        renovationCost: renoCost,
        otherCost,
        debt: 0,
        debtAnnualRate: 0,
        expectedExitValue: exitVal,
        monthlyRent,
        monthlyExpenses: 0,
        vacancyPercent: 5,
        sellingFeePercent: 1,
        durationMonths,
        investorAmount: calc.effectiveAmount,
      };

      const cleanTitle =
        scenarioTitle.trim() ||
        `سرمایه‌گذاری ${formatCompactToman(calc.effectiveAmount)} تومان (${formatToman(calc.shares)} سهم)`;

      const r = await fetch("/api/analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectSlug,
          name: cleanTitle,
          input: payloadInput,
        }),
      });
      const d = (await r.json()) as { run?: Run; error?: string };
      if (!r.ok || !d.run) throw new Error(d.error || "خطا در ذخیرهٔ محاسبه");
      setRuns((prev) => [d.run!, ...prev].slice(0, 20));
      setMessage("محاسبهٔ سود شما با موفقیت در سوابق حسابتان ذخیره شد.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="investment-lab live-finance" style={{ marginTop: 22 }}>
      <div className="panel-title-row" style={{ flexWrap: "wrap", gap: 10 }}>
        <div>
          <span className="mini-label">ماشین‌حساب شفاف سرمایه‌گذار</span>
          <h2>
            <Calculator size={20} style={{ verticalAlign: "middle", marginLeft: 6 }} />
            شبیه‌ساز هوشمند سود و بازگشت سرمایهٔ شما در «{project?.name}»
          </h2>
        </div>
        <span className="yield-badge">
          قیمت هر سهم: {formatToman(unitPrice)} تومان
        </span>
      </div>

      <p className="lab-intro" style={{ margin: "8px 0 18px" }}>
        کافی است <strong>مبلغ سرمایه‌گذاری</strong>، <strong>مدت نگهداری</strong> و <strong>سناریوی بازار</strong> را انتخاب کنید تا تعداد سهام، سود رشد قیمت ملک و عواید کیف پول اجاره به زبان ساده برای شما محاسبه شود.
      </p>

      {/* Step 1: Investment Amount Picker */}
      <div
        style={{
          background: "var(--ice-white)",
          border: "1px solid var(--hairline)",
          borderRadius: 14,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)" }}>
            ۱. مبلغ سرمایه‌گذاری مورد نظر شما:
          </span>
          <div style={{ textAlign: "left" }}>
            <strong style={{ fontSize: 20, color: "var(--brick)" }}>
              {formatToman(calc.effectiveAmount)} تومان
            </strong>
            <small style={{ display: "block", fontSize: 11, color: "var(--profit-green)", fontWeight: 800 }}>
              معادل {formatToman(calc.shares)} سهم از {project?.name}
            </small>
          </div>
        </div>

        <input
          type="range"
          min={unitPrice}
          max={500_000_000}
          step={unitPrice}
          value={investorAmount}
          onChange={(e) => setInvestorAmount(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--brick)", cursor: "pointer", marginBottom: 10 }}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              className={`geo-switch-btn ${Math.abs(investorAmount - amt) < unitPrice ? "active" : ""}`}
              onClick={() => setInvestorAmount(amt)}
            >
              {formatCompactToman(amt)} تومان
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 & 3: Duration & Market Scenario */}
      <div className="form-grid-two" style={{ gap: 14, marginBottom: 18 }}>
        <div
          style={{
            background: "var(--ice-white)",
            border: "1px solid var(--hairline)",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 8 }}>
            ۲. مدت نگهداری سرمایه‌گذاری:
          </span>
          <div className="term-switch">
            {PRESET_MONTHS.map((m) => (
              <button
                key={m}
                type="button"
                className={durationMonths === m ? "active" : ""}
                onClick={() => setDurationMonths(m)}
              >
                {formatToman(m)} ماه
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "var(--ice-white)",
            border: "1px solid var(--hairline)",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 8 }}>
            ۳. سناریوی بازده پروژه:
          </span>
          <div className="term-switch">
            {([
              ["conservative", "محافظه‌کارانه"],
              ["base", "پایه (کارشناسی)"],
              ["optimistic", "خوش‌بینانه"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={selectedScenario === key ? "active" : ""}
                onClick={() => setSelectedScenario(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clear Visual Output Summary */}
      <div
        style={{
          background: "linear-gradient(145deg, rgba(30, 107, 82, .08), var(--whiteout))",
          border: "1px solid rgba(30, 107, 82, .28)",
          borderRadius: 16,
          padding: 20,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            paddingBottom: 14,
            borderBottom: "1px solid var(--hairline)",
          }}
        >
          <div>
            <span style={{ fontSize: 12, color: "var(--muted)", display: "block" }}>
              مبلغ کل دریافتی شما در پایان {formatToman(durationMonths)} ماه (اصل سرمایه + سود خالص)
            </span>
            <strong style={{ fontSize: "clamp(22px, 3vw, 28px)", color: "var(--profit-green)", display: "block", marginTop: 4 }}>
              {formatToman(calc.active.finalValue)} تومان
            </strong>
          </div>
          <div style={{ textAlign: "left" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>کل سود خالص شما</span>
            <strong style={{ fontSize: 20, color: "var(--brick)" }}>
              +{formatToman(calc.active.totalProfit)} تومان (+{formatToman(calc.active.totalRoiPct)}٪)
            </strong>
          </div>
        </div>

        <div className="calc-breakdown" style={{ marginTop: 14 }}>
          <div>
            <span>
              <Coins size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> تعداد سهام شما
            </span>
            <strong>{formatToman(calc.shares)} سهم</strong>
          </div>
          <div>
            <span>
              <TrendingUp size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> سود رشد قیمت ملک
            </span>
            <strong style={{ color: "var(--profit-green)" }}>+{formatToman(calc.active.capitalProfit)} تومان</strong>
          </div>
          <div>
            <span>
              <KeyRound size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> عواید کیف پول اجاره
            </span>
            <strong style={{ color: calc.active.rentalProfit > 0 ? "var(--brick)" : "var(--muted)" }}>
              {calc.active.rentalProfit > 0 ? `+${formatToman(calc.active.rentalProfit)} تومان` : "سود در زمان فروش"}
            </strong>
          </div>
        </div>

        {/* Visual Bar */}
        <div style={{ marginTop: 16 }}>
          <div className="wealth-weight-bar" style={{ height: 14, margin: "6px 0" }}>
            <span
              style={{ width: `${calc.principalPct}%`, background: "var(--royalblue)" }}
              title={`اصل سرمایه: ${formatToman(calc.effectiveAmount)} تومان`}
            />
            <span
              style={{ width: `${calc.capPct}%`, background: "var(--profit-green)" }}
              title={`سود رشد قیمت: +${formatToman(calc.active.capitalProfit)} تومان`}
            />
            {calc.rentPct > 0 && (
              <span
                style={{ width: `${calc.rentPct}%`, background: "var(--brick)" }}
                title={`عواید کیف پول اجاره: +${formatToman(calc.active.rentalProfit)} تومان`}
              />
            )}
          </div>
          <div className="wealth-legend" style={{ fontSize: 11, marginTop: 8 }}>
            <span>
              <i style={{ background: "var(--royalblue)" }} /> اصل سرمایه ({formatToman(calc.effectiveAmount)} تومان)
            </span>
            <span>
              <i style={{ background: "var(--profit-green)" }} /> سود رشد قیمت (+{formatToman(calc.active.capitalProfit)} تومان)
            </span>
            {calc.active.rentalProfit > 0 && (
              <span>
                <i style={{ background: "var(--brick)" }} /> کیف پول اجاره (+{formatToman(calc.active.rentalProfit)} تومان)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Save Calculation to Customer History */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          maxLength={100}
          value={scenarioTitle}
          onChange={(e) => setScenarioTitle(e.target.value)}
          placeholder="عنوان دلخواه برای ذخیره در سوابق شما…"
          style={{
            flex: 1,
            minWidth: 220,
            minHeight: 42,
            borderRadius: 10,
            border: "1px solid var(--hairline)",
            padding: "8px 12px",
            background: "var(--ice-white)",
            fontSize: 12,
          }}
        />
        <button type="button" className="button button-red" disabled={busy} onClick={() => void saveCalculation()}>
          <Save size={15} /> {busy ? "در حال ذخیره…" : "ذخیرهٔ این محاسبه در سوابق من"}
        </button>
      </div>

      {message && (
        <p role="status" className="sim-success" style={{ marginTop: 12, padding: 10, borderRadius: 8 }}>
          <CheckCircle2 size={15} /> {message}
        </p>
      )}

      {runs.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--hairline)" }}>
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>
            <History size={15} style={{ verticalAlign: "middle", marginLeft: 4 }} /> محاسبات ذخیره‌شدهٔ قبلی شما در این پروژه:
          </h3>
          <div className="financial-history">
            {runs.slice(0, 6).map((r) => (
              <button
                type="button"
                className="button button-ghost button-small"
                key={r.id}
                onClick={() => {
                  setInvestorAmount(r.input.investorAmount || 50_000_000);
                  setDurationMonths(r.input.durationMonths || 12);
                  setScenarioTitle(r.name);
                }}
              >
                {r.name} · {new Date(r.createdAt).toLocaleDateString("fa-IR")}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
