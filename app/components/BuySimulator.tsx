"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeInfo, CheckCircle2, Coins, ShoppingCart, TrendingDown, Wallet } from "lucide-react";
import type { Property } from "@/lib/data";
import { formatCompactToman, formatToman } from "@/lib/data";
import { readJson } from "@/lib/api-client";

const modes = [
  { id: "market", title: "خرید مستقیم سهام", detail: "صدور آنی در پرتفوی و قابل فروش در بازار ثانویه" },
  { id: "lock", title: "نگهداری بلندمدت", detail: "افق کامل پروژه با کارمزد کمتر" },
  { id: "sell", title: "فروش سریع در بازار ثانویه", detail: "ثبت سفارش فروش سهام موجود شما در تابلو" },
] as const;

export function BuySimulator({ property }: { property: Property }) {
  const unitPrice = property.tokenPriceCurrent || property.tokenPriceInitial || 500_000;
  const minInv = property.minimumInvestment || unitPrice;
  const [shares, setShares] = useState(10);
  const [sellPrice, setSellPrice] = useState(unitPrice);
  const [mode, setMode] = useState<(typeof modes)[number]["id"]>("market");
  const [scenario, setScenario] = useState<"conservative" | "base" | "optimistic">("base");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [ownedShares, setOwnedShares] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refreshAccount = useCallback(async () => {
    try {
      const r = await fetch(`/api/market?project=${encodeURIComponent(property.slug)}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = await readJson<{
        wallet?: { balanceToman: number };
        holdings?: Array<{ projectSlug: string; shares: number; lockedShares: number }>;
      }>(r);
      if (d.wallet) setWalletBalance(d.wallet.balanceToman);
      const h = d.holdings?.find((item) => item.projectSlug === property.slug);
      setOwnedShares((h?.shares ?? 0) + (h?.lockedShares ?? 0));
    } catch {
      // Guest user
    }
  }, [property.slug]);

  useEffect(() => {
    void refreshAccount();
    const onMarketUpdate = () => void refreshAccount();
    window.addEventListener("khesht:market-updated", onMarketUpdate);
    window.addEventListener("focus", onMarketUpdate);
    return () => {
      window.removeEventListener("khesht:market-updated", onMarketUpdate);
      window.removeEventListener("focus", onMarketUpdate);
    };
  }, [refreshAccount]);

  const simulation = useMemo(() => {
    const activeUnitPrice = mode === "sell" ? sellPrice : unitPrice;
    const amount = shares * activeUnitPrice;
    const estimatedReturn =
      scenario === "conservative"
        ? property.estimatedReturnLow || 16
        : scenario === "optimistic"
          ? property.estimatedReturnHigh || 32
          : property.estimatedReturnBase || 24;
    const rent = Math.round(amount * ((property.rentalYield || 0) / 100) * (mode === "lock" ? 2 : 1));
    const feeRate = mode === "lock" ? 0.005 : 0.01;
    const fees = Math.round(amount * feeRate);
    const gross = Math.round(amount * (1 + estimatedReturn / 100));
    const net = gross + rent - fees;
    return { amount, tokens: shares, gross, estimatedReturn, rent, fees, net };
  }, [shares, sellPrice, unitPrice, mode, property, scenario]);

  async function executeTrade() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const payload =
        mode === "sell"
          ? {
              action: "place_order",
              projectSlug: property.slug,
              side: "sell",
              shares,
              priceToman: sellPrice,
            }
          : {
              action: "primary_buy",
              projectSlug: property.slug,
              shares,
            };
      const r = await fetch("/api/market", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.status === 401) {
        window.location.assign("/auth");
        return;
      }
      const d = await readJson<{ message?: string; error?: string }>(r);
      if (!r.ok) throw new Error(d.error || "خطا در ثبت تراکنش");
      setMessage(d.message || "تراکنش با موفقیت در حساب و داشبورد شما ثبت شد.");
      await refreshAccount();
      window.dispatchEvent(new CustomEvent("khesht:market-updated"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="buy-card">
      <div className="buy-card-head">
        <div>
          <span className="mini-label">معاملهٔ آنلاین سهام پروژه (متصل به داشبورد)</span>
          <h2>خرید و فروش سهام {property.name}</h2>
        </div>
        <Coins size={24} />
      </div>

      <div className="buy-summary" style={{ marginTop: 12, marginBottom: 12 }}>
        <div>
          <span>قیمت فعلی هر سهم</span>
          <strong>{formatToman(unitPrice)} تومان</strong>
        </div>
        <div>
          <span>موجودی کیف پول شما</span>
          <strong>{walletBalance !== null ? `${formatCompactToman(walletBalance)} تومان` : "نیازمند ورود"}</strong>
        </div>
        <div>
          <span>سهام شما در این پروژه</span>
          <strong style={{ color: "var(--profit-green)" }}>{formatToman(ownedShares)} سهم</strong>
        </div>
      </div>

      <div className="mode-tabs">
        {modes.map((item) => (
          <button
            type="button"
            key={item.id}
            className={mode === item.id ? "active" : ""}
            onClick={() => {
              setMode(item.id);
              setMessage("");
              setError("");
            }}
          >
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </button>
        ))}
      </div>

      <div className="form-grid-two" style={{ marginTop: 14 }}>
        <label className="amount-field">
          <span>تعداد سهام مورد نظر</span>
          <div>
            <input
              type="number"
              min={1}
              max={100000}
              value={shares}
              onChange={(event) => setShares(Math.max(1, Number(event.target.value) || 1))}
            />
            <b>سهم ({property.tokenSymbol || "KH"})</b>
          </div>
        </label>

        <label className="amount-field">
          <span>{mode === "sell" ? "قیمت پیشنهادی فروش هر سهم" : "قیمت واحد هر سهم"}</span>
          <div>
            <input
              type="number"
              min={50000}
              step={5000}
              disabled={mode !== "sell"}
              value={mode === "sell" ? sellPrice : unitPrice}
              onChange={(event) => setSellPrice(Math.max(50000, Number(event.target.value) || unitPrice))}
            />
            <b>تومان</b>
          </div>
        </label>
      </div>

      {mode !== "sell" && simulation.amount < minInv && (
        <div className="sim-error">
          <BadgeInfo size={15} /> حداقل مبلغ خرید در این پروژه {formatToman(minInv)} تومان است.
        </div>
      )}

      <div className="scenario-row">
        <span>سناریوی بازدهی برآوردی</span>
        <div>
          <button
            type="button"
            className={scenario === "conservative" ? "active" : ""}
            onClick={() => setScenario("conservative")}
          >
            محافظه‌کارانه
          </button>
          <button type="button" className={scenario === "base" ? "active" : ""} onClick={() => setScenario("base")}>
            پایه
          </button>
          <button
            type="button"
            className={scenario === "optimistic" ? "active" : ""}
            onClick={() => setScenario("optimistic")}
          >
            خوش‌بینانه
          </button>
        </div>
      </div>

      <div className="buy-summary">
        <div>
          <span>مبلغ کل معامله</span>
          <strong>{formatToman(simulation.amount)} تومان</strong>
        </div>
        <div>
          <span>تعداد سهام</span>
          <strong>{formatToman(simulation.tokens)} سهم</strong>
        </div>
        <div>
          <span>بازدهی برآوردی دوره</span>
          <strong className="sim-accent">{simulation.estimatedReturn}٪</strong>
        </div>
        <div>
          <span>عواید کیف پول اجاره</span>
          <strong>{simulation.rent > 0 ? `${formatCompactToman(simulation.rent)} تومان` : "سود سرمایه‌ای فروش"}</strong>
        </div>
        <div>
          <span>کارمزد سامانه</span>
          <strong>{formatCompactToman(simulation.fees)} تومان</strong>
        </div>
        <div>
          <span>ارزش خالص برآوردی در افق</span>
          <strong>{formatCompactToman(simulation.net)} تومان</strong>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <button
          type="button"
          className="button button-red button-wide"
          onClick={() => void executeTrade()}
          disabled={busy || shares < 1 || (mode === "sell" && ownedShares < shares)}
        >
          {busy ? (
            "در حال ثبت در سرور…"
          ) : mode === "sell" ? (
            <>
              <TrendingDown size={16} /> ثبت سفارش فروش {formatToman(shares)} سهم در بازار ثانویه
            </>
          ) : (
            <>
              <ShoppingCart size={16} /> خرید قطعی {formatToman(shares)} سهم ({formatToman(simulation.amount)} تومان)
            </>
          )}
        </button>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/market/${property.slug}`} className="button button-ghost" style={{ flex: 1 }}>
            تابلوی بازار ثانویهٔ این پروژه <ArrowLeft size={15} />
          </Link>
          <Link href="/dashboard" className="button button-ghost" style={{ flex: 1 }}>
            <Wallet size={15} /> مشاهده در داشبورد من
          </Link>
        </div>
      </div>

      {message && (
        <p className="sim-success" role="status" style={{ marginTop: 12, padding: 10, borderRadius: 8 }}>
          <CheckCircle2 size={15} /> {message}
        </p>
      )}
      {error && (
        <p className="sim-error" role="alert" style={{ marginTop: 12 }}>
          <BadgeInfo size={15} /> {error}
        </p>
      )}
    </section>
  );
}
