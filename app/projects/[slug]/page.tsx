import Link from "next/link";
import Image from "next/image";
import { getCurrentActor, getProjectActor } from "@/lib/control";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  Coins,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FolderOpen,
  Layers3,
  LineChart,
  MapPin,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { BlockArt } from "../../components/BlockArt";
import { BuySimulator } from "../../components/BuySimulator";
import { LegalDisclaimer } from "../../components/LegalDisclaimer";
import { PilotRecordPanel } from "../../components/PilotRecordPanel";
import { ProjectVisualBrief } from "../../components/ProjectVisualBrief";
import { ProjectInvestmentLab } from "../../components/ProjectInvestmentLab";
import { properties, getProjectCategoryBadge, getReassuringRiskLabel, formatToman, formatCompactToman } from "@/lib/data";
import { getProjectBundle } from "@/lib/projects-server";
import { FinancialAnalysisStudio } from "@/app/components/FinancialAnalysisStudio";
import { CaseStageSummary } from "@/app/components/CaseStageSummary";
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return properties.map((property) => ({ slug: property.slug }));
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const actor = await getCurrentActor();
  const projectActor = actor ? await getProjectActor(actor, slug) : null;
  if (actor && !projectActor) notFound();
  const bundle = await getProjectBundle(slug);
  if (!bundle) notFound();
  const { property, profile } = bundle;

  const unitPrice = property.tokenPriceCurrent || property.tokenPriceInitial || 500_000;
  const valuation = property.projectValuation || 38_500_000_000;
  const targetCap = property.targetCapital || 12_000_000_000;
  const raisedCap = property.raisedCapital || Math.round(targetCap * (property.progress / 100));

  const sampleInvestment = profile.simulation.defaultAmount || 50_000_000;
  const sampleShares = Math.max(1, Math.round(sampleInvestment / unitPrice));
  const actualSampleAmount = sampleShares * unitPrice;
  const rentTotal = Math.round(actualSampleAmount * ((property.rentalYield || 0) / 100) * (profile.horizon.months / 12));

  const prePurchaseScenarios = [
    {
      key: "conservative",
      title: "سناریوی محافظه‌کارانه",
      subtitle: "با فرض تأخیر جزیی و افزایش هزینهٔ اجرا",
      rate: property.estimatedReturnLow || 14,
      capitalProfit: Math.round(actualSampleAmount * ((property.estimatedReturnLow || 14) / 100)),
      rentProfit: Math.round(rentTotal * 0.85),
    },
    {
      key: "base",
      title: "سناریوی پایه (مبنای کارشناسی)",
      subtitle: `طبق برنامهٔ ${formatToman(profile.horizon.months)} ماههٔ پرونده`,
      rate: property.estimatedReturnBase || 24,
      capitalProfit: Math.round(actualSampleAmount * ((property.estimatedReturnBase || 24) / 100)),
      rentProfit: rentTotal,
    },
    {
      key: "optimistic",
      title: "سناریوی خوش‌بینانه",
      subtitle: "تحقق کامل برنامه و رشد تقاضای منطقه",
      rate: property.estimatedReturnHigh || 32,
      capitalProfit: Math.round(actualSampleAmount * ((property.estimatedReturnHigh || 32) / 100)),
      rentProfit: Math.round(rentTotal * 1.1),
    },
  ];

  const currentLifecycleStage =
    property.lifecycle.find((item) => item.status === "current") ??
    property.lifecycle[property.lifecycle.length - 1];
  const doneStagesCount = property.lifecycle.filter((item) => item.status === "done").length;

  // Determine which physical construction stage is currently active based on property.progress
  const activePhysicalIdx = property.progressUpdates.findIndex(
    (u, idx) =>
      property.progress <= u.progress || idx === property.progressUpdates.length - 1,
  );

  return (
    <>
      <Header />
      <main>
        <div className="shell detail-layout">
          {/* Left Sticky Column: Visuals, Graphical Progress Chart & Stage Roadmap */}
          <div className="detail-art-wrap">
            <BlockArt accent={property.accent} image={property.image} alt={`نمای معماری ${property.name}`} />
            <div className="detail-art-caption">
              <span>
                <MapPin size={13} /> {property.location}
              </span>
              <span>
                وضعیت فعلی: <strong>{property.status}</strong> · {property.progress === 0 ? "پیشرفت فیزیکی ساخت: ۰٪ (مرحلهٔ جذب سرمایه)" : `پیشرفت فیزیکی: ${formatToman(property.progress)}٪`}
              </span>
            </div>

            {/* Valuation & Capital Raising Card */}
            <div className="valuation-card" style={{ marginTop: 18 }}>
              <div>
                <span className="mini-label">ارزش‌گذاری کل و جذب سرمایه</span>
                <h2>{formatCompactToman(valuation)} تومان</h2>
                <p>
                  سرمایهٔ هدف: {formatCompactToman(targetCap)} تومان · جذب‌شده:{" "}
                  <strong>{formatCompactToman(raisedCap)} تومان</strong>
                </p>
              </div>
              <div style={{ display: "grid", gap: 6, alignContent: "center" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span>پیشرفت طبق برنامه</span>
                  <strong>{formatToman(property.plannedProgress || property.progress)}٪</strong>
                </div>
                <div className="progress-line" style={{ margin: "2px 0 8px" }}>
                  <span style={{ width: `${property.plannedProgress || property.progress}%`, background: "var(--royalblue)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span>پیشرفت واقعی ثبت‌شده</span>
                  <strong style={{ color: "var(--profit-green)" }}>
                    {formatToman(property.actualProgress || property.progress)}٪
                  </strong>
                </div>
                <div className="progress-line" style={{ margin: "2px 0" }}>
                  <span style={{ width: `${property.actualProgress || property.progress}%`, background: "var(--profit-green)" }} />
                </div>
              </div>
              <div className="valuation-dates">
                <span>تاریخ آخرین ارزیابی: {property.valuationDate || "۱۴۰۵/۰۵/۱۲"}</span>
                <span>ارزیابی دورهٔ بعد: {property.nextValuationDate || "۱۴۰۵/۰۸/۱۲"}</span>
              </div>
            </div>

            {/* Graphical Progress Bar Chart (from original project files) + Current Stage Indicator */}
            {property.progressUpdates && property.progressUpdates.length > 0 && (
              <div className="report-chart-panel" style={{ marginTop: 18 }}>
                <div className="panel-title-row">
                  <div>
                    <span className="mini-label">نمودار گرافیکی مراحل تکمیل پروژه</span>
                    <h2 style={{ fontSize: 18 }}>مقایسهٔ برنامه و پیشرفت واقعی در هر فاز</h2>
                  </div>
                  <LineChart size={20} color="var(--brick)" />
                </div>

                {/* Current Active Phase Callout */}
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(30, 107, 82, .10)",
                    border: "1px solid rgba(30, 107, 82, .25)",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span>
                    فاز اجرایی فعلی پروژه:{" "}
                    <strong style={{ color: "var(--profit-green)" }}>
                      {property.progressUpdates[Math.max(0, activePhysicalIdx)]?.stage} ({property.status})
                    </strong>
                  </span>
                  <span className="yield-badge" style={{ fontSize: 11 }}>
                    {formatToman(property.progress)}٪ تکمیل
                  </span>
                </div>

                <div className="progress-chart" style={{ height: 210, marginTop: 18 }}>
                  <div className="chart-axis">
                    <span>۱۰۰٪</span>
                    <span>۷۵٪</span>
                    <span>۵۰٪</span>
                    <span>۲۵٪</span>
                    <span>۰٪</span>
                  </div>
                  <div className="chart-bars">
                    {property.progressUpdates.map((item, idx) => {
                      const isDone = property.progress >= item.progress;
                      const isCurrent = idx === activePhysicalIdx && !isDone;
                      const actualBarHeight = isDone
                        ? item.progress
                        : isCurrent
                          ? property.progress
                          : Math.max(8, Math.round(property.progress * 0.35));
                      return (
                        <div className="chart-bar-group" key={item.stage}>
                          <div
                            className="chart-bar planned"
                            title={`هدف فاز ${item.stage}: ${formatToman(item.progress)}٪`}
                            style={{ height: `${Math.min(100, item.progress)}%` }}
                          />
                          <div
                            className="chart-bar actual"
                            title={`پیشرفت ثبت‌شده: ${formatToman(actualBarHeight)}٪`}
                            style={{
                              height: `${Math.min(100, actualBarHeight)}%`,
                              background: isDone ? "var(--profit-green)" : isCurrent ? "var(--brick)" : "#94a3b8",
                            }}
                          />
                          <small style={{ fontWeight: isCurrent || isDone ? 800 : 400 }}>{item.stage}</small>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="wealth-legend" style={{ marginTop: 30, fontSize: 10 }}>
                  <span>
                    <i style={{ background: "#e7bea8" }} /> سقف مرحلهٔ برنامه‌ای
                  </span>
                  <span>
                    <i style={{ background: "var(--profit-green)" }} /> مرحلهٔ تکمیل‌شده
                  </span>
                  <span>
                    <i style={{ background: "var(--brick)" }} /> فاز در حال اجرای فعلی
                  </span>
                </div>

                {/* Visual Cards for Each Stage from Original Files */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
                  {property.progressUpdates.map((item, idx) => {
                    const isDone = property.progress >= item.progress;
                    const isCurrent = idx === activePhysicalIdx && !isDone;
                    return (
                      <article
                        key={item.stage}
                        style={{
                          border: isCurrent
                            ? "2px solid var(--brick)"
                            : isDone
                              ? "1px solid rgba(30, 107, 82, .35)"
                              : "1px solid var(--hairline)",
                          borderRadius: 10,
                          overflow: "hidden",
                          background: "var(--ice-white)",
                        }}
                      >
                        <div className="gallery-image" style={{ height: 110 }}>
                          <Image
                            src={item.image}
                            alt={item.stage}
                            fill
                            sizes="(max-width: 700px) 50vw, 25vw"
                            style={{ objectFit: "cover" }}
                          />
                          <span
                            style={{
                              background: isDone
                                ? "var(--profit-green)"
                                : isCurrent
                                  ? "var(--brick)"
                                  : "rgba(33,37,41,.72)",
                            }}
                          >
                            {isDone ? "تکمیل‌شده" : isCurrent ? "در حال اجرا (فاز فعلی)" : "فاز آتی"} · {formatToman(item.progress)}٪
                          </span>
                        </div>
                        <div style={{ padding: 10 }}>
                          <strong style={{ fontSize: 12, display: "block" }}>{item.stage}</strong>
                          <small style={{ color: isDone ? "var(--profit-green)" : "var(--brick)", fontSize: 10, fontWeight: 700 }}>
                            {item.date}
                          </small>
                          <p style={{ fontSize: 10, color: "var(--muted)", margin: "4px 0 0", lineHeight: 1.6 }}>
                            {item.note}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Main Detail Column */}
          <div className="detail-copy">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <Link href="/projects" className="inline-link">
                <ArrowRight size={15} /> بازگشت به فهرست پروژه‌ها
              </Link>
              <Link href="/profile" className="inline-link">
                مشاهدهٔ پروفایل و داشبورد من
              </Link>
            </div>

            <div className="detail-meta" style={{ marginTop: 20 }}>
              <span>{getProjectCategoryBadge(property)}</span>
              <i />
              <span>مرحلهٔ فعلی: {property.status}</span>
              <i />
              <span style={{ color: "var(--profit-green)", fontWeight: 700 }}>{getReassuringRiskLabel(property)}</span>
              <i />
              <span>افق: {property.lockup}</span>
            </div>

            <h1>{property.name}</h1>

            {projectActor && ["admin", "project_manager"].includes(projectActor.role) && (
              <Link className="button button-ghost button-small" href={`/projects/${slug}/edit`}>
                ویرایش اطلاعات و ریسک‌ها
              </Link>
            )}

            <p>{property.description}</p>

            <div className="detail-stat-grid">
              <div>
                <span>قیمت فعلی هر سهم ({property.tokenSymbol || "KH"})</span>
                <strong>{formatToman(unitPrice)} تومان</strong>
              </div>
              <div>
                <span>بازده پایهٔ برآوردی (سالانه)</span>
                <strong className="detail-Yield">
                  {formatToman(property.estimatedReturnBase || 24)}٪ (بازهٔ {formatToman(property.estimatedReturnLow || 14)}٪ تا{" "}
                  {formatToman(property.estimatedReturnHigh || 32)}٪)
                </strong>
              </div>
              <div>
                <span>عواید اجاره و استراتژی خروج</span>
                <strong>
                  {property.rentalYield ? `${formatToman(property.rentalYield)}٪ اجاره سالانه` : property.exitStrategy}
                </strong>
              </div>
            </div>

            <div className="token-identity-card">
              <div className="token-mark">
                <Coins size={17} />
              </div>
              <div>
                <span>نماد معاملاتی پروژه در خشت: {property.tokenName || property.name}</span>
                <strong>{property.tokenSymbol || `KH-${property.slug.toUpperCase()}`}</strong>
                <small>
                  کل سهام پروژه: {formatToman(property.totalTokenSupply || 50_000)} سهم · آمادهٔ عرضه:{" "}
                  {formatToman(property.availableTokenSupply || 25_000)} سهم · سرمایه‌گذاران فعال:{" "}
                  {formatToman(property.simulatedHolders || 140)} نفر
                </small>
              </div>
              <span className="verified-chip">
                <ShieldCheck size={14} /> فعال در بازار ثانویه
              </span>
            </div>

            <div className="feature-pills">
              {property.features.map((feature) => (
                <span key={feature}>{feature}</span>
              ))}
            </div>

            {/* Graphical Project Dossier Lifecycle Tracker (Showing exact current stage from property.lifecycle) */}
            <section className="lifecycle-panel" style={{ marginTop: 18, marginBottom: 22 }}>
              <div className="panel-title-row">
                <div>
                  <span className="mini-label">موقعیت کنونی پروژه در چرخهٔ عمر</span>
                  <h2>این پروژه هم‌اکنون در کدام مرحله قرار دارد؟</h2>
                </div>
                <span className="yield-badge">
                  مرحلهٔ جاری: {currentLifecycleStage?.title}
                </span>
              </div>

              <div className="lifecycle-status-summary">
                <div>
                  <span>وضعیت فعلی پرونده در خشت</span>
                  <strong>
                    {currentLifecycleStage?.title} ({property.status})
                  </strong>
                  <small>{currentLifecycleStage?.note} · پیشرفت کلی فیزیکی: {formatToman(property.progress)}٪</small>
                </div>
                <div className="lifecycle-progress-orbit">
                  <b>
                    {formatToman(doneStagesCount + 1)}/{formatToman(property.lifecycle.length)}
                  </b>
                  <small>گام فعال</small>
                </div>
              </div>

              <div className="lifecycle-track" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {property.lifecycle.map((item, index) => (
                  <div key={item.title} className={`lifecycle-step ${item.status}`}>
                    <span>
                      گام ۰{formatToman(index + 1)} ·{" "}
                      {item.status === "done"
                        ? "تکمیل‌شده"
                        : item.status === "current"
                          ? "در حال اجرا (جاری)"
                          : "مرحلهٔ بعدی"}
                    </span>
                    <strong>{item.title}</strong>
                    <small>{item.note}</small>
                  </div>
                ))}
              </div>
            </section>

            {/* NEW: Pre-Purchase Investment Scenarios & Profit Forecast BEFORE Buying */}
            <section className="investment-lab" style={{ marginTop: 0, marginBottom: 22 }}>
              <div className="panel-title-row">
                <div>
                  <span className="mini-label">بررسی پیش از خرید سهام</span>
                  <h2>
                    <Calculator size={19} style={{ verticalAlign: "middle", marginLeft: 6 }} />
                    سناریوهای سرمایه‌گذاری و پیش‌بینی سود (به‌ازای {formatCompactToman(actualSampleAmount)} تومان /{" "}
                    {formatToman(sampleShares)} سهم)
                  </h2>
                </div>
                <TrendingUp size={20} color="var(--profit-green)" />
              </div>
              <p className="lab-intro" style={{ margin: "8px 0 14px" }}>
                پیش از ثبت سفارش خرید، بازده و سود خالص برآوردی این پروژه را در سه سناریوی محافظه‌کارانه، پایه و خوش‌بینانه برای افق{" "}
                <strong>{formatToman(profile.horizon.months)} ماهه</strong> مقایسه کنید:
              </p>

              <div className="finance-scenario-grid">
                {prePurchaseScenarios.map((sc) => {
                  const totalProfit = sc.capitalProfit + sc.rentProfit;
                  const finalAmount = actualSampleAmount + totalProfit;
                  return (
                    <article key={sc.key} className={`finance-result ${sc.key}`}>
                      <span className="mini-label">{sc.title}</span>
                      <strong>+{formatToman(sc.rate)}٪</strong>
                      <small>{sc.subtitle}</small>
                      <dl style={{ marginTop: 10 }}>
                        <div>
                          <dt>سرمایهٔ اولیه ({formatToman(sampleShares)} سهم)</dt>
                          <dd>{formatToman(actualSampleAmount)} تومان</dd>
                        </div>
                        <div>
                          <dt>سود رشد ارزش سهام</dt>
                          <dd style={{ color: "var(--profit-green)" }}>+{formatToman(sc.capitalProfit)} تومان</dd>
                        </div>
                        <div>
                          <dt>عواید اجاره‌ای دوره</dt>
                          <dd style={{ color: "var(--profit-green)" }}>+{formatToman(sc.rentProfit)} تومان</dd>
                        </div>
                        <div>
                          <dt>کل سود خالص پیش‌بینی‌شده</dt>
                          <dd style={{ color: "var(--profit-green)", fontSize: 12 }}>+{formatToman(totalProfit)} تومان</dd>
                        </div>
                        <div>
                          <dt>ارزش کل در پایان دوره</dt>
                          <dd style={{ color: "var(--royalblue)", fontSize: 12 }}>{formatToman(finalAmount)} تومان</dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* Interactive Share Buying & Selling Terminal */}
            <BuySimulator property={property} />

            {/* Project Overview, Interactive Google Map, Horizon & Multi-Bullet Risk Scenario Matrix */}
            <ProjectVisualBrief profile={profile} />

            {/* Downloadable Fake PDF & XLSX Dossier Files */}
            <section className="lifecycle-panel" style={{ marginTop: 22 }}>
              <div className="panel-title-row" style={{ flexWrap: "wrap" }}>
                <div>
                  <span className="mini-label">فایل‌های قابل دانلود اتاق اسناد (PDF و Excel)</span>
                  <h2>مستندات، مدل مالی اکسل و گزارش کارشناسی {property.name}</h2>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a
                    href={`/api/project-control/mock-files?project=${encodeURIComponent(property.slug)}&format=pdf&title=dossier`}
                    target="_blank"
                    rel="noreferrer"
                    className="button button-red button-small"
                  >
                    <Download size={14} /> دانلود دفترچهٔ پروژه (PDF)
                  </a>
                  <a
                    href={`/api/project-control/mock-files?project=${encodeURIComponent(property.slug)}&format=xlsx&title=financial-model`}
                    className="button button-ghost button-small"
                  >
                    <FileSpreadsheet size={14} /> دانلود مدل مالی و سود (XLSX)
                  </a>
                </div>
              </div>

              <div className="document-grid" style={{ marginTop: 14 }}>
                {property.documents.slice(0, 5).map((doc, idx) => (
                  <div className="document-card" key={doc.title}>
                    <div className="document-icon">
                      <FileCheck2 size={18} />
                    </div>
                    <div className="document-main">
                      <div className="document-top">
                        <strong>{doc.title}</strong>
                        <span className="access-badge">{doc.access}</span>
                      </div>
                      <p>
                        {doc.category} · تاریخ انتشار: {doc.date}
                      </p>
                      <div className="document-status">
                        <CheckCircle2 size={11} style={{ verticalAlign: "middle", marginLeft: 4 }} />
                        {doc.status}
                      </div>
                    </div>
                    <div className="document-actions" style={{ display: "flex", gap: 6 }}>
                      <a
                        href={`/api/project-control/mock-files?project=${encodeURIComponent(property.slug)}&format=pdf&title=doc-${idx + 1}`}
                        target="_blank"
                        rel="noreferrer"
                        className="button button-ghost button-small"
                        style={{ padding: "5px 9px", fontSize: 10, width: "auto" }}
                      >
                        <Download size={12} /> PDF
                      </a>
                      {(doc.category.includes("مالی") || doc.category.includes("ارزش")) && (
                        <a
                          href={`/api/project-control/mock-files?project=${encodeURIComponent(property.slug)}&format=xlsx&title=model-${idx + 1}`}
                          className="button button-red button-small"
                          style={{ padding: "5px 9px", fontSize: 10, width: "auto" }}
                        >
                          <FileSpreadsheet size={12} /> XLSX
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                <Link href={`/projects/${property.slug}/documents`} className="button button-ghost button-small">
                  <FolderOpen size={14} /> ورود به اتاق دادهٔ کامل پروژه
                </Link>
                <a
                  className="button button-ghost button-small"
                  target="_blank"
                  rel="noreferrer"
                  href={`/api/project-control/report?project=${property.slug}`}
                >
                  نسخهٔ چاپی گزارش رسمی (A4 / Save as PDF)
                </a>
              </div>
            </section>

            <LegalDisclaimer />
            <ProjectInvestmentLab property={property} profile={profile} />
            <FinancialAnalysisStudio projectSlug={property.slug} horizonMonths={profile.horizon.months} />
            <CaseStageSummary projectSlug={property.slug} />

            <div className="detail-action-row">
              <Link href={`/market/${property.slug}`} className="button button-red">
                <BarChart3 size={16} /> بازار ثانویهٔ این پروژه
              </Link>
              <Link href="/profile" className="button button-ghost">
                <WalletCards size={16} /> مشاهدهٔ پروفایل و داشبورد من
              </Link>
            </div>

            <PilotRecordPanel projectSlug={property.slug} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
