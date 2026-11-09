"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  ArrowLeft,
  Calculator,
  Coins,
  ExternalLink,
  LocateFixed,
  MapPin,
  Plus,
  Minus,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  formatToman,
  getProjectCategoryBadge,
  getReassuringRiskLabel,
  projectProfiles,
  type InvestmentModel,
  type Property,
} from "@/lib/data";
import { readJson } from "@/lib/api-client";
import { BlockArt } from "./BlockArt";

type HoldingMap = Record<string, number>;

export function HomeInteractiveLanding({ initialProjects }: { initialProjects: Property[] }) {
  const [projects] = useState<Property[]>(initialProjects);
  const [holdings, setHoldings] = useState<HoldingMap>({});
  const [heroSlug, setHeroSlug] = useState<string>(initialProjects[1]?.slug ?? initialProjects[0]?.slug ?? "shahrak-west");
  const [heroShares, setHeroShares] = useState<number>(10);
  const [filterModel, setFilterModel] = useState<"all" | InvestmentModel>("all");
  const [calcAmount, setCalcAmount] = useState<number>(50_000_000);
  const [calcMonths, setCalcMonths] = useState<number>(12);
  const [calcScenario, setCalcScenario] = useState<"conservative" | "base" | "optimistic">("base");
  const [mapSlug, setMapSlug] = useState<string>(initialProjects[1]?.slug ?? initialProjects[0]?.slug ?? "shahrak-west");
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [heroFeedback, setHeroFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [gridFeedback, setGridFeedback] = useState<{ slug: string; type: "ok" | "err"; text: string } | null>(null);

  const syncWithBackend = useCallback(async () => {
    try {
      const r = await fetch("/api/market", { cache: "no-store" });
      if (!r.ok) return;
      const d = await readJson<{
        holdings?: Array<{ projectSlug: string; shares: number; lockedShares: number }>;
      }>(r);
      if (d.holdings) {
        const map: HoldingMap = {};
        for (const h of d.holdings) {
          map[h.projectSlug] = (h.shares ?? 0) + (h.lockedShares ?? 0);
        }
        setHoldings(map);
      }
    } catch {
      // Guest user
    }
  }, []);

  useEffect(() => {
    void syncWithBackend();
    const onMarketUpdate = () => void syncWithBackend();
    window.addEventListener("khesht:market-updated", onMarketUpdate);
    window.addEventListener("focus", onMarketUpdate);
    return () => {
      window.removeEventListener("khesht:market-updated", onMarketUpdate);
      window.removeEventListener("focus", onMarketUpdate);
    };
  }, [syncWithBackend]);

  const heroProject = useMemo(
    () => projects.find((p) => p.slug === heroSlug) ?? projects[0],
    [projects, heroSlug],
  );

  const filteredProjects = useMemo(
    () => (filterModel === "all" ? projects : projects.filter((p) => p.investmentModel === filterModel)),
    [projects, filterModel],
  );

  const mapProject = useMemo(
    () => projects.find((p) => p.slug === mapSlug) ?? projects[0],
    [projects, mapSlug],
  );

  const mapCoords = useMemo(() => {
    if (!mapProject) return { lat: 35.7589, lng: 51.3708 };
    const geo = projectProfiles[mapProject.slug]?.geo;
    return {
      lat: mapProject.latitude ?? geo?.lat ?? 35.7589,
      lng: mapProject.longitude ?? geo?.lng ?? 51.3708,
    };
  }, [mapProject]);

  const calcStats = useMemo(() => {
    const annualCapRate =
      calcScenario === "conservative" ? 0.17 : calcScenario === "optimistic" ? 0.34 : 0.27;
    const annualRentRate = 0.08;
    const factor = calcMonths / 12;
    const capGain = Math.round(calcAmount * annualCapRate * factor);
    const rentGain = Math.round(calcAmount * annualRentRate * factor);
    const totalProfit = capGain + rentGain;
    const finalVal = calcAmount + totalProfit;
    const roiPct = Math.round((totalProfit / Math.max(1, calcAmount)) * 100);
    const shares = Math.max(1, Math.round(calcAmount / 545_000));
    const principalWidth = Math.round((calcAmount / Math.max(1, finalVal)) * 100);
    return {
      capGain,
      rentGain,
      totalProfit,
      finalVal,
      roiPct,
      shares,
      principalWidth,
      profitWidth: 100 - principalWidth,
    };
  }, [calcAmount, calcMonths, calcScenario]);

  async function executePrimaryBuy(targetSlug: string, sharesCount: number, isHero: boolean) {
    setBusySlug(targetSlug);
    if (isHero) setHeroFeedback(null);
    else setGridFeedback(null);

    try {
      const r = await fetch("/api/market", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "primary_buy",
          projectSlug: targetSlug,
          shares: sharesCount,
        }),
      });
      if (r.status === 401) {
        window.location.assign("/auth");
        return;
      }
      const d = await readJson<{ message?: string; error?: string }>(r);
      if (!r.ok) throw new Error(d.error || "خطا در ثبت خرید سهام");
      const text = d.message || "خرید سهام با موفقیت در پرتفوی شما ثبت شد.";
      if (isHero) setHeroFeedback({ type: "ok", text });
      else setGridFeedback({ slug: targetSlug, type: "ok", text });
      await syncWithBackend();
      window.dispatchEvent(new CustomEvent("khesht:market-updated"));
    } catch (e) {
      const text = (e as Error).message;
      if (isHero) setHeroFeedback({ type: "err", text });
      else setGridFeedback({ slug: targetSlug, type: "err", text });
    } finally {
      setBusySlug(null);
    }
  }

  const heroUnitPrice = heroProject ? heroProject.tokenPriceCurrent || heroProject.tokenPriceInitial || 500_000 : 545_000;
  const heroTotalCost = Math.max(1, heroShares) * heroUnitPrice;
  const heroExitValue = Math.round(heroTotalCost * (1 + ((heroProject?.estimatedReturnBase || 27) / 100)));

  return (
    <>
      {/* Live Market Ticker Strip */}
      <div className="proof-strip" style={{ padding: "10px 0" }}>
        <div
          className="shell"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 12,
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800, color: "var(--royalblue)" }}>
            <span className="live-dot">نبض بازار ثانویه:</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18 }}>
            {projects.slice(0, 4).map((p) => {
              const price = p.tokenPriceCurrent || p.tokenPriceInitial || 500_000;
              return (
                <Link
                  key={p.slug}
                  href={`/market/${p.slug}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11 }}
                >
                  <strong>{p.name} ({p.tokenSymbol}):</strong>
                  <span>{formatToman(price)} تومان</span>
                  <span className="yield-badge" style={{ padding: "2px 6px", fontSize: 10 }}>
                    +{formatToman(p.estimatedReturnBase || 24)}٪
                  </span>
                </Link>
              );
            })}
          </div>
          <Link href="/market" className="inline-link" style={{ fontSize: 12 }}>
            ورود به بازار ثانویه <ArrowLeft size={14} />
          </Link>
        </div>
      </div>

      {/* SECTION 1: HERO WITH LIVE DEAL WIDGET (4 duplicate metric boxes removed per Screenshot 2) */}
      <section className="hero-wrap">
        <div className="hero shell">
          <div className="hero-copy">
            <span className="kicker">
              <strong style={{ color: "var(--brick)", fontWeight: 900 }}>خشت،</strong> نسل نوین پلتفرم‌های مدیریت ثروت و سرمایه‌گذاری ملکی در ایران
            </span>
            <h1>
              <em>سرمایه‌گذاری ملکی</em> با سرمایهٔ خرد
              <br />
              <span className="hero-h1-subline">شفاف، مستند و نقدشونده</span>
            </h1>
            <p className="hero-lead">
              در خشت امکان مالکیت سهامی در بهترین پروژه‌های ساختمانی کشور با گزارش کارشناسی رسمی، حساب امانی بانکی و ابزارهای مدیریت ریسک سرمایه‌گذاری برای علاقه‌مندان به سرمایه‌گذاری ملکی فراهم شده است. پیشرفت واقعی هر کارگاه مرحله‌به‌مرحله قابل رصد است و به صورت ۲۴ ساعته در بازار ثانویه امکان معاملات وجود دارد.
            </p>
            <div className="hero-cta">
              <a href="#projects-section" className="button button-red">
                مشاهده و مقایسهٔ پروژه‌های فعال <ArrowLeft size={17} />
              </a>
              <a href="#calculator-section" className="button button-ghost">
                شبیه‌ساز سود سرمایه‌گذاری
              </a>
            </div>
          </div>

          {/* Interactive Featured Project Deal Widget */}
          {heroProject && (
            <div className="hero-visual-wrap">
              <div className="hero-card" style={{ padding: 20 }}>
                <div className="hero-card-top" style={{ borderBottom: "1px solid var(--hairline)", paddingBottom: 12 }}>
                  <div>
                    <span style={{ color: "var(--brick)", fontWeight: 800, display: "block" }}>
                      پروژهٔ شاخص در حال عرضه ({heroProject.status})
                    </span>
                    <strong style={{ fontSize: 18, color: "var(--navy)" }}>
                      {heroProject.name} — {heroProject.location}
                    </strong>
                  </div>
                  <span className="yield-badge">+{formatToman(heroProject.estimatedReturnBase || 27)}٪ بازده پایه</span>
                </div>

                {/* Project Switcher Tabs */}
                <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 0" }}>
                  {projects.slice(0, 4).map((item) => (
                    <button
                      key={item.slug}
                      type="button"
                      className={`geo-switch-btn ${item.slug === heroProject.slug ? "active" : ""}`}
                      onClick={() => {
                        setHeroSlug(item.slug);
                        setHeroFeedback(null);
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>

                <div className="hero-art" style={{ height: 200, marginBottom: 12 }}>
                  <BlockArt
                    image={heroProject.image}
                    accent={heroProject.accent}
                    alt={`نمای معماری ${heroProject.name}`}
                  />
                </div>

                <div className="buy-summary" style={{ margin: "10px 0" }}>
                  <div>
                    <span>قیمت فعلی هر سهم</span>
                    <strong>{formatToman(heroUnitPrice)} تومان</strong>
                  </div>
                  <div>
                    <span>پیشرفت فیزیکی</span>
                    <strong>
                      {heroProject.progress === 0
                        ? "۰٪ (مرحلهٔ جذب سرمایه)"
                        : `${formatToman(heroProject.progress)}٪ تکمیل`}
                    </strong>
                  </div>
                  <div>
                    <span>دارایی فعلی شما</span>
                    <strong style={{ color: "var(--profit-green)" }}>
                      {formatToman(holdings[heroProject.slug] ?? 0)} سهم
                    </strong>
                  </div>
                </div>

                <div className="progress-line" style={{ margin: "10px 0 14px" }}>
                  <span style={{ width: `${heroProject.progress}%` }} />
                </div>

                {/* Quick Share Stepper & Instant Backend Purchase */}
                <div
                  style={{
                    background: "var(--ice-white)",
                    border: "1px solid var(--hairline)",
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>تعداد سهام برای خرید آنی:</span>
                    <div className="stepper" style={{ padding: 4 }}>
                      <button
                        type="button"
                        aria-label="کاهش تعداد سهام"
                        onClick={() => setHeroShares((s) => Math.max(1, s - 5))}
                      >
                        <Minus size={14} />
                      </button>
                      <strong>{formatToman(heroShares)}</strong>
                      <button
                        type="button"
                        aria-label="افزایش تعداد سهام"
                        onClick={() => setHeroShares((s) => s + 5)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: "1px solid var(--hairline)",
                    }}
                  >
                    <span>مبلغ قابل پرداخت:</span>
                    <strong style={{ fontSize: 15, color: "var(--royalblue)" }}>
                      {formatToman(heroTotalCost)} تومان
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                    <span>ارزش برآوردی در پایان دوره:</span>
                    <strong style={{ color: "var(--profit-green)" }}>{formatToman(heroExitValue)} تومان</strong>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      className="button button-red"
                      style={{ flex: 1 }}
                      disabled={busySlug === heroProject.slug}
                      onClick={() => void executePrimaryBuy(heroProject.slug, heroShares, true)}
                    >
                      <ShoppingCart size={15} />{" "}
                      {busySlug === heroProject.slug ? "در حال ثبت در سرور…" : "خرید آنی و ثبت در پرتفوی"}
                    </button>
                    <Link href={`/projects/${heroProject.slug}`} className="button button-ghost">
                      جزئیات پروژه
                    </Link>
                  </div>

                  {heroFeedback && (
                    <p
                      role="status"
                      className={heroFeedback.type === "ok" ? "sim-success" : "sim-error"}
                      style={{ marginTop: 10, padding: 8, borderRadius: 8 }}
                    >
                      {heroFeedback.text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: FILTERABLE PROJECT SHOWCASE CONNECTED TO BACKEND */}
      <section id="projects-section" className="section shell">
        <div className="section-heading" style={{ flexWrap: "wrap" }}>
          <div>
            <span className="mini-label">ویترین فرصت‌های سرمایه‌گذاری ملکی</span>
            <h2>پروژه‌ها را بر اساس مدل سرمایه‌گذاری مقایسه کنید</h2>
          </div>
          <div className="filter-chips" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={filterModel === "all" ? "active" : ""}
              onClick={() => setFilterModel("all")}
            >
              همهٔ پروژه‌ها ({formatToman(projects.length)})
            </button>
            <button
              type="button"
              className={filterModel === "hold" ? "active" : ""}
              onClick={() => setFilterModel("hold")}
            >
              ساخت - فروش
            </button>
            <button
              type="button"
              className={filterModel === "flip" ? "active" : ""}
              onClick={() => setFilterModel("flip")}
            >
              بازسازی - فروش
            </button>
            <button
              type="button"
              className={filterModel === "rent" ? "active" : ""}
              onClick={() => setFilterModel("rent")}
            >
              ساخت - اجاره
            </button>
          </div>
        </div>

        <div className="property-grid">
          {filteredProjects.map((p) => {
            const price = p.tokenPriceCurrent || p.tokenPriceInitial || 500_000;
            const userOwned = holdings[p.slug] ?? 0;
            const fb = gridFeedback?.slug === p.slug ? gridFeedback : null;
            const isFundingStage = p.progress === 0 || p.status.includes("جذب سرمایه");
            const fundingPct = p.targetCapital > 0 ? Math.round((p.raisedCapital / p.targetCapital) * 100) : 26;

            return (
              <article key={p.slug} className="property-card" style={{ display: "flex", flexDirection: "column" }}>
                <Link href={`/projects/${p.slug}`} className="property-visual" style={{ display: "block" }}>
                  <BlockArt accent={p.accent} image={p.image} alt={`نمای معماری ${p.name}`} />
                  <span className="status-pill">{p.status}</span>
                  <span className="property-type">{getProjectCategoryBadge(p)}</span>
                </Link>
                <div className="property-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div className="property-title-row">
                    <div>
                      <h3>
                        <Link href={`/projects/${p.slug}`}>{p.name}</Link>
                      </h3>
                      <p>
                        <MapPin size={13} /> {p.location} · نماد: {p.tokenSymbol}
                      </p>
                    </div>
                    <span className="yield-badge">
                      <TrendingUp size={13} /> +{formatToman(p.estimatedReturnBase || 24)}٪ بازده پایه
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 0", lineHeight: 1.75 }}>
                    {p.description}
                  </p>

                  <div className="property-metrics" style={{ marginTop: 16 }}>
                    <div>
                      <span>
                        <Coins size={13} /> قیمت هر سهم
                      </span>
                      <strong>{formatToman(price)} تومان</strong>
                    </div>
                    <div>
                      <span>
                        <Wallet size={13} /> دارایی شما
                      </span>
                      <strong style={{ color: "var(--profit-green)" }}>{formatToman(userOwned)} سهم</strong>
                    </div>
                  </div>

                  <div className="progress-line">
                    <span style={{ width: `${isFundingStage ? 0 : p.progress}%` }} />
                  </div>

                  <div className="property-meta-line" style={{ marginBottom: 14 }}>
                    <span>
                      {isFundingStage
                        ? `پیشرفت فیزیکی ساخت: ۰٪ (جذب سرمایه: ${formatToman(fundingPct)}٪)`
                        : `پیشرفت فیزیکی پروژه: ${formatToman(p.progress)}٪ تکمیل‌شده`}
                    </span>
                    <span style={{ color: "var(--profit-green)", fontWeight: 600 }}>
                      {getReassuringRiskLabel(p)}
                    </span>
                  </div>

                  {fb && (
                    <p
                      role="status"
                      className={fb.type === "ok" ? "sim-success" : "sim-error"}
                      style={{ marginBottom: 10, padding: 8, borderRadius: 8 }}
                    >
                      {fb.text}
                    </p>
                  )}

                  <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="button button-red button-small"
                      style={{ flex: 1 }}
                      disabled={busySlug === p.slug}
                      onClick={() => void executePrimaryBuy(p.slug, 5, false)}
                    >
                      {busySlug === p.slug ? "در حال ثبت…" : "خرید سریع (۵ سهم)"}
                    </button>
                    <Link href={`/market/${p.slug}`} className="button button-ghost button-small">
                      بازار ثانویه
                    </Link>
                    <Link href={`/projects/${p.slug}`} className="button button-ghost button-small">
                      پرونده
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: INTERACTIVE RETURN & WEALTH CALCULATOR */}
      <section id="calculator-section" className="section shell">
        <div className="calculator-card" style={{ padding: "clamp(22px, 4vw, 38px)" }}>
          <div className="toolkit-grid" style={{ alignItems: "center", gap: 32 }}>
            <div>
              <span className="mini-label">
                <Calculator size={14} /> شبیه‌ساز هوشمند سرمایه‌گذاری
              </span>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", margin: "8px 0 8px", color: "var(--navy)" }}>
                برآورد بازده سرمایه و عواید اجاره‌ای
              </h2>
              <p className="calculator-intro" style={{ margin: "0 0 20px" }}>
                مبلغ سرمایه‌گذاری، افق زمانی و سناریوی بازار را تغییر دهید تا سود خالص برآوردی را مشاهده کنید.
              </p>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
                  <span>مبلغ سرمایه‌گذاری شما:</span>
                  <strong style={{ color: "var(--brick)", fontSize: 16 }}>{formatToman(calcAmount)} تومان</strong>
                </div>
                <input
                  type="range"
                  min={5_000_000}
                  max={500_000_000}
                  step={5_000_000}
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--nitro-orange)", cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)" }}>
                  <span>۵ میلیون تومان</span>
                  <span>۲۵۰ میلیون تومان</span>
                  <span>۵۰۰ میلیون تومان</span>
                </div>
              </div>

              <div className="form-grid-two" style={{ gap: 14 }}>
                <div className="term-picker" style={{ marginTop: 0 }}>
                  <span>افق نگهداری:</span>
                  <div className="term-switch">
                    {[12, 18, 24].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={calcMonths === m ? "active" : ""}
                        onClick={() => setCalcMonths(m)}
                      >
                        {formatToman(m)} ماه
                      </button>
                    ))}
                  </div>
                </div>

                <div className="term-picker" style={{ marginTop: 0 }}>
                  <span>سناریوی بازار:</span>
                  <div className="term-switch">
                    {([
                      ["conservative", "محافظه‌کار"],
                      ["base", "پایه"],
                      ["optimistic", "خوش‌بینانه"],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={calcScenario === key ? "active" : ""}
                        onClick={() => setCalcScenario(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                background: "var(--ice-white)",
                border: "1px solid var(--hairline)",
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 16,
                  borderBottom: "1px solid var(--hairline)",
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>
                    ارزش کل برآوردی در پایان دوره (اصل + سود)
                  </span>
                  <strong style={{ fontSize: "clamp(22px, 3vw, 30px)", color: "var(--profit-green)", display: "block", marginTop: 4 }}>
                    {formatToman(calcStats.finalVal)} تومان
                  </strong>
                </div>
                <div style={{ textAlign: "left" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>نرخ بازده کل دوره</span>
                  <strong style={{ fontSize: 22, color: "var(--brick)" }}>+{formatToman(calcStats.roiPct)}٪</strong>
                </div>
              </div>

              <div className="calc-breakdown" style={{ marginTop: 16 }}>
                <div>
                  <span>معادل تعداد سهام</span>
                  <strong>{formatToman(calcStats.shares)} سهم</strong>
                </div>
                <div>
                  <span>سود رشد ارزش ملک</span>
                  <strong style={{ color: "var(--profit-green)" }}>{formatToman(calcStats.capGain)} تومان</strong>
                </div>
                <div>
                  <span>عواید کیف پول اجاره</span>
                  <strong style={{ color: "var(--profit-green)" }}>{formatToman(calcStats.rentGain)} تومان</strong>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                  <span style={{ color: "var(--muted)", fontWeight: 700 }}>ترکیب اصل سرمایه و سود خالص</span>
                  <strong style={{ color: "var(--profit-green)" }}>
                    سود خالص: {formatToman(calcStats.totalProfit)} تومان
                  </strong>
                </div>
                <div className="wealth-weight-bar" style={{ height: 16, margin: "6px 0" }}>
                  <span style={{ width: `${calcStats.principalWidth}%`, background: "var(--royalblue)" }} />
                  <span style={{ width: `${calcStats.profitWidth}%`, background: "var(--profit-green)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                  <Link href="/wealth" className="inline-link">
                    ساخت سبد اختصاصی در استودیو مدیریت ثروت <ArrowLeft size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: INTERACTIVE TEHRAN GOOGLE MAP SHOWCASE */}
      <section id="map-section" className="section section-soft">
        <div className="shell">
          <div className="project-map-card" style={{ marginTop: 0 }}>
            <div className="panel-title-row" style={{ flexWrap: "wrap" }}>
              <div>
                <span className="mini-label">جانمایی جغرافیایی روی نقشهٔ گوگل</span>
                <h2>موقعیت پروژه‌های خشت در تهران و کشور</h2>
              </div>
              <LocateFixed size={22} color="var(--royalblue)" />
            </div>

            <div className="geo-map-toolbar">
              <div className="geo-provider-switch">
                {projects.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    className={`geo-switch-btn ${mapProject?.slug === p.slug ? "active" : ""}`}
                    onClick={() => setMapSlug(p.slug)}
                  >
                    <MapPin size={12} /> {p.name}
                  </button>
                ))}
              </div>
              {mapProject && (
                <div className="geo-external-links">
                  <Link href={`/projects/${mapProject.slug}`} className="inline-link">
                    پروندهٔ {mapProject.name}
                  </Link>
                  <a
                    href={`https://www.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}&hl=fa&z=15`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-link"
                  >
                    مشاهده در Google Maps <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>

            <div className="geo-map" style={{ height: 350 }}>
              <iframe
                key={`${mapCoords.lat},${mapCoords.lng}`}
                title={`نقشه گوگل ${mapProject?.name ?? "خشت"}`}
                src={`https://maps.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}&hl=fa&z=15&output=embed`}
                className="geo-map-iframe"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
              {mapProject && (
                <span className="geo-scale">
                  {mapProject.location} ({mapCoords.lat.toFixed(4)}, {mapCoords.lng.toFixed(4)})
                </span>
              )}
            </div>

            {mapProject && (
              <div className="geo-map-summary">
                <div>
                  <span>پروژهٔ انتخاب‌شده</span>
                  <strong>
                    {mapProject.name} ({mapProject.location})
                  </strong>
                </div>
                <div>
                  <span>قیمت هر سهم و بازده پایه</span>
                  <strong>
                    {formatToman(mapProject.tokenPriceCurrent || 525_000)} تومان · +{formatToman(mapProject.estimatedReturnBase || 24)}٪
                  </strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <span>نماد معاملاتی</span>
                    <strong>{mapProject.tokenSymbol}</strong>
                  </div>
                  <Link href={`/projects/${mapProject.slug}`} className="button button-red button-small">
                    بررسی و خرید سهام
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 6: 4-STEP TRANSPARENT GOVERNANCE & DATA ROOM PROCESS */}
      <section id="process-section" className="section shell">
        <div className="section-heading">
          <div>
            <span className="mini-label">حاکمیت داده و شفافیت حقوقی</span>
            <h2>چگونه هر پروژه در خشت ارزیابی و عرضه می‌شود؟</h2>
          </div>
          <Link href="/how-it-works" className="inline-link">
            مشاهدهٔ جزئیات مراحل کنترلی <ArrowLeft size={15} />
          </Link>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <span className="step-number">۰۱ / پذیرش و غربالگری</span>
            <h3>پذیرش و غربالگری ملک</h3>
            <p>بررسی مدارک ثبتی، مجوزهای ساخت، اهلیت سازنده و تعریف ساختار سهام در پروندهٔ پروژه.</p>
          </div>
          <div className="step-card">
            <span className="step-number">۰۲ / اتاق دادهٔ شفاف</span>
            <h3>تشکیل اتاق دادهٔ نسخه‌دار</h3>
            <p>بارگذاری اسناد فنی، حقوقی و مالی با کنترل اصالت (SHA-256) و بازبینی توسط کارشناس مستقل.</p>
          </div>
          <div className="step-card">
            <span className="step-number">۰۳ / عرضهٔ اولیه و کیف پول اجاره</span>
            <h3>عرضهٔ اولیه و عواید اجاره‌ای</h3>
            <p>خرید سهام پروژه با موجودی کیف پول، صدور آنی گواهی مالکیت و دریافت عواید در کیف پول اجاره.</p>
          </div>
          <div className="step-card">
            <span className="step-number">۰۴ / بازار ثانویه</span>
            <h3>معاملهٔ ۲۴/۷ در بازار ثانویه</h3>
            <p>نقدشوندگی سهام در هر زمان از طریق ثبت سفارش خرید و فروش در صفحهٔ بازار ثانویه و تسویهٔ آنی.</p>
          </div>
        </div>
      </section>
    </>
  );
}
