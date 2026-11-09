import Link from "next/link";
import { ArrowLeft, Check, FileCheck2, Gauge, Timer } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { FinancingSimulator } from "../components/FinancingSimulator";
import { LegalDisclaimer } from "../components/LegalDisclaimer";

const steps = [
  { icon: FileCheck2, title: "پروندهٔ اولیه", text: "اطلاعات پروژه، مالکیت، مجوزها و برنامهٔ ساخت در یک فرم قابل پیگیری ثبت می‌شود." },
  { icon: Gauge, title: "غربالگری", text: "توان پروژه، آورده، زمان‌بندی و مسیر درآمدی در یک سناریوی قابل مقایسه بررسی می‌شود." },
  { icon: Timer, title: "ساختار و گزارش", text: "در صورت تأیید، تقویم ارزش‌گذاری، گزارش پیشرفت و سطح دسترسی اسناد تعریف می‌شود." },
];

export default function FinancePage() {
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">برای سازنده‌ها</span>
            <h1>پروژه‌ات را به مسیر سرمایه وصل کن.</h1>
            <p>یک مسیر محصولی برای معرفی پروژه، سنجش اولیه و ساخت پروندهٔ تأمین مالی توکن‌محور.</p>
          </div>
        </section>
        <section className="section shell finance-layout">
          <div>
            <LegalDisclaimer />
            <FinancingSimulator />
          </div>
          <aside className="finance-aside">
            <span className="mini-label">فرایند پنج‌مرحله‌ای</span>
            <h2>هر عدد، یک توضیح دارد.</h2>
            <p>این صفحه از الگوی فرم‌های کوتاه و مرحله‌ای الهام گرفته، اما متن، داده و هویت آن مستقل و مخصوص خشت است.</p>
            <div className="finance-step-list">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return <div className="finance-step" key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><Icon size={18} /><div><strong>{step.title}</strong><p>{step.text}</p></div></div>;
              })}
            </div>
            <Link href="/faq" className="inline-link">پاسخ پرسش‌های رایج <ArrowLeft size={15} /></Link>
          </aside>
        </section>
        <section className="section section-soft">
          <div className="shell finance-benefits">
            <div><Check size={17} /><span>پاسخ اولیهٔ سریع‌تر با پروندهٔ ساختاریافته</span></div>
            <div><Check size={17} /><span>نمایش روشن هزینه، آورده و مبلغ درخواستی</span></div>
            <div><Check size={17} /><span>اتصال گزارش پروژه به تجربهٔ سرمایه‌گذار</span></div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
