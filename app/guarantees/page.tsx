import Link from "next/link";
import {
  ArrowLeft,
  FileCheck2,
  Landmark,
  LockKeyhole,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { LegalDisclaimer } from "../components/LegalDisclaimer";
import { InvestorInfographicSection } from "../components/InvestorInfographicSection";
import { properties, projectProfiles, getProjectCategoryBadge, getReassuringRiskLabel } from "@/lib/data";

const mechanisms = [
  {
    icon: FileCheck2,
    title: "اتاق اسناد سطح‌بندی‌شده و هش SHA-256",
    text: "خلاصهٔ پروژه، گزارش پیشرفت، ارزش‌گذاری و ضمائم قراردادی در اتاق اسناد ثبت می‌شوند و اصالت هر سند قابل بررسی است.",
  },
  {
    icon: Scale,
    title: "ارزیابی و ممیزی مستقل",
    text: "منبع ارزش‌گذاری، تاریخ گزارش و تطابق برنامه با پیشرفت واقعی در هر دوره ثبت شده و توسط بازبین مستقل کنترل می‌شود.",
  },
  {
    icon: Landmark,
    title: "حساب امانی و ذخایر احتیاطی ساخت",
    text: "وجوه جذب‌شده در حساب امانی نگهداری شده و ذخایر احتیاطی برای پوشش کامل هزینه‌های اجرایی لحاظ می‌گردد.",
  },
  {
    icon: LockKeyhole,
    title: "کیف پول اجاره و نقدشوندگی بازار ثانویه",
    text: "عواید پروژه‌های اجاره‌داری در کیف پول اجاره واریز شده و اصل سهام نیز ۲۴/۷ در بازار ثانویه قابل معامله است.",
  },
];

const riskTone = { پایین: "low", متوسط: "medium", بالا: "medium" } as const;
const reassuringBadge = {
  پایین: "کم‌ریسک · پوشش‌یافته",
  متوسط: "کنترل‌شده با حساب امانی",
  بالا: "تحت پوشش تضامین ملکی",
} as const;

export default function GuaranteesPage() {
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">اعتماد، تضامین و کنترل ریسک</span>
            <h1>چارچوب تضامین، حساب امانی و سازوکارهای محافظت از سرمایه</h1>
            <p>
              در خشت، نوع تضمین، ساختار حقوقی، گیت‌های ۹ مرحله‌ای پرونده و راهکارهای محافظت از سرمایه برای تک‌تک پروژه‌ها به‌صورت شفاف مستند شده است.
            </p>
          </div>
        </section>

        <section className="section shell">
          <LegalDisclaimer />
          <div className="guarantee-grid">
            {mechanisms.map((item) => {
              const Icon = item.icon;
              return (
                <article className="guarantee-card" key={item.title}>
                  <div className="guarantee-icon">
                    <Icon size={20} />
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>

          {/* 9-Stage Governance Gate Checklist */}
          <div className="lifecycle-panel" style={{ marginTop: 28 }}>
            <div className="panel-title-row">
              <div>
                <span className="mini-label">گیت‌های ۹ مرحله‌ای کنترل پرونده</span>
                <h2>مراحل ممیزی و تأیید پیش از عرضه و تسویه</h2>
              </div>
              <ShieldCheck size={22} color="var(--profit-green)" />
            </div>
            <div className="lifecycle-track" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(115px, 1fr))" }}>
              {[
                ["۰۱", "پذیرش پروژه", "بررسی ثبتی و اهلیت مجری"],
                ["۰۲", "اتاق داده", "ثبت اسناد و نقشه‌های رسمی"],
                ["۰۳", "برنامهٔ مالی", "مدل ۳ سناریویی سود و هزینه"],
                ["۰۴", "گزارش کارشناسی", "ارزیابی کارشناس رسمی"],
                ["۰۵", "حساب امانی", "ذخیرهٔ احتیاطی و نظارت مقیم"],
                ["۰۶", "تأیید مستقل", "ممیزی توسط بازبین غیرذی‌نفع"],
                ["۰۷", "عرضهٔ سهام", "ثبت در داشبورد سرمایه‌گذاران"],
                ["۰۸", "بازار ثانویه", "معاملهٔ آنی در تابلوی سفارش‌ها"],
                ["۰۹", "کیف پول اجاره و تسویه", "توزیع عواید و سود نهایی"],
              ].map(([num, title, note]) => (
                <div className="lifecycle-step done" key={num}>
                  <span>گام {num}</span>
                  <strong>{title}</strong>
                  <small>{note}</small>
                </div>
              ))}
            </div>
          </div>

          {/* Per-Project Guarantee & Risk Mitigation Matrix */}
          <div style={{ marginTop: 42 }}>
            <div className="section-heading">
              <div>
                <span className="mini-label">پشتوانهٔ اجرایی و حقوقی پروژه‌های فعال</span>
                <h2>سازوکارهای تضمین و راهکارهای کنترلی به تفکیک هر پروژه</h2>
              </div>
              <Link href="/projects" className="inline-link">
                مشاهدهٔ همهٔ پروژه‌ها <ArrowLeft size={15} />
              </Link>
            </div>

            <div style={{ display: "grid", gap: 20 }}>
              {properties.map((prop) => {
                const prof = projectProfiles[prop.slug];
                if (!prof) return null;
                return (
                  <section className="risk-scenario-board" key={prop.slug} style={{ marginTop: 0 }}>
                    <div className="panel-title-row" style={{ flexWrap: "wrap" }}>
                      <div>
                        <span className="mini-label" style={{ color: "var(--profit-green)" }}>
                          {prop.location} · {getProjectCategoryBadge(prop)} · مرحلهٔ فعلی: {prop.status} · {getReassuringRiskLabel(prop)}
                        </span>
                        <h2>{prop.name}</h2>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Link href={`/projects/${prop.slug}`} className="button button-ghost button-small">
                          باز کردن صفحهٔ اختصاصی پروژه
                        </Link>
                        <ShieldCheck size={20} color="var(--profit-green)" />
                      </div>
                    </div>
                    <div className="risk-scenario-grid">
                      {prof.riskScenarios.map((scenario, idx) => (
                        <article className={`risk-scenario risk-${riskTone[scenario.level]}`} key={scenario.title}>
                          <div className="risk-head">
                            <span>۰{idx + 1}</span>
                            <b style={{ color: "var(--profit-green)" }}>{reassuringBadge[scenario.level]}</b>
                          </div>
                          <h3>{scenario.title}</h3>
                          <div>
                            <small>موضوع تحت پایش</small>
                            <p>{scenario.trigger}</p>
                          </div>
                          <div>
                            <small>تضامین و اقدامات کنترلی خشت</small>
                            <ul style={{ margin: "6px 0 0", paddingRight: 16, fontSize: 11, lineHeight: 1.85, color: "var(--blackstone)" }}>
                              {scenario.response
                                .split("|")
                                .map((item) => item.trim())
                                .filter(Boolean)
                                .map((bullet) => (
                                  <li key={bullet}>{bullet}</li>
                                ))}
                            </ul>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </section>

        <InvestorInfographicSection />
      </main>
      <Footer />
    </>
  );
}
