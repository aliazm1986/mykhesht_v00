import Link from "next/link";
import { ArrowDownUp, BarChart3, FileText, FolderOpen, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { LegalDisclaimer } from "../components/LegalDisclaimer";
import { InvestorInfographicSection } from "../components/InvestorInfographicSection";

export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">فرآیند سرمایه‌گذاری در خشت</span>
            <h1>مسیر شفاف از ارزیابی ملک تا بازار ثانویه</h1>
            <p>در خشت، هر پروژه پیش از عرضه و در طول دورهٔ ساخت و بهره‌برداری، در ۹ گام کنترلی مستندسازی و پایش می‌شود.</p>
          </div>
        </section>
        <section className="shell" style={{ paddingTop: 28 }}>
          <LegalDisclaimer />
        </section>
        <section className="shell">
          <div className="how-grid">
            <article className="how-card">
              <Search size={22} color="var(--red)" />
              <span>گام ۰۱</span>
              <h2>پذیرش و غربالگری ملک</h2>
              <p>مشخصات ثبتی، فنی، موقعیت مکانی و اهلیت مجری پروژه بررسی و در پروندهٔ نسخه‌دار ثبت می‌شود.</p>
            </article>
            <article className="how-card">
              <FolderOpen size={22} color="var(--red)" />
              <span>گام ۰۲</span>
              <h2>تشکیل اتاق داده (Data Room)</h2>
              <p>اسناد مالکیت، مجوزها، نقشه‌های فنی و گزارش‌های کارشناسی با کنترل اصالت در اتاق داده بارگذاری می‌شوند.</p>
            </article>
            <article className="how-card">
              <BarChart3 size={22} color="var(--red)" />
              <span>گام ۰۳</span>
              <h2>مدل مالی و سناریوهای بازده</h2>
              <p>مدل سرمایه‌گذاری (ساخت - فروش، بازسازی - فروش یا ساخت - اجاره) و سه سناریوی سود تدوین می‌شود.</p>
            </article>
            <article className="how-card">
              <FileText size={22} color="var(--red)" />
              <span>گام ۰۴</span>
              <h2>گزارش کارشناسی و ارزیابی</h2>
              <p>خلاصهٔ مستندات فنی و مالی پروژه در قالب گزارش ساختاریافته برای مطالعهٔ سرمایه‌گذاران تولید می‌گردد.</p>
            </article>
            <article className="how-card">
              <BarChart3 size={22} color="var(--red)" />
              <span>گام ۰۵</span>
              <h2>پل ارزش و قیمت‌گذاری هر سهم</h2>
              <p>ارزش خالص دارایی پس از کسر ذخایر احتیاطی به واحدهای سهام استاندارد تقسیم می‌شود.</p>
            </article>
            <article className="how-card">
              <ShieldCheck size={22} color="var(--red)" />
              <span>گام ۰۶</span>
              <h2>تأیید بازبین مستقل</h2>
              <p>تطابق اسناد اتاق داده، مفروضات مالی و قیمت هر سهم توسط بازبین مستقل کنترل و تأیید می‌گردد.</p>
            </article>
            <article className="how-card">
              <LockKeyhole size={22} color="var(--red)" />
              <span>گام ۰۷</span>
              <h2>عرضهٔ اولیه سهام پروژه</h2>
              <p>سهام پروژه با قیمت مصوب عرضه شده و سرمایه‌گذاران می‌توانند با موجودی کیف پول خود سهام را خریداری کنند.</p>
            </article>
            <article className="how-card">
              <ArrowDownUp size={22} color="var(--red)" />
              <span>گام ۰۸</span>
              <h2>معامله در بازار ثانویه</h2>
              <p>دارندگان سهام می‌توانند در هر زمان سهام خود را در تابلوی بازار ثانویه به قیمت دلخواه عرضه یا خریداری نمایند.</p>
            </article>
            <article className="how-card">
              <FileText size={22} color="var(--red)" />
              <span>گام ۰۹</span>
              <h2>کیف پول اجاره و تسویهٔ نهایی</h2>
              <p>عواید پروژه‌های اجاره‌داری به کیف پول اجاره واریز شده و سود فروش نهایی پروژه با سهام‌داران تسویه می‌شود.</p>
            </article>
          </div>
        </section>

        {/* Cohesive Visual Infographic Section replacing the plain checklist */}
        <InvestorInfographicSection />
      </main>
      <Footer />
    </>
  );
}
