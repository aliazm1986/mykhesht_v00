import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { AutoInvestPanel } from "../components/AutoInvestPanel";

export default function AutoInvestPage() {
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">سوابق معاملاتی و مدیریت اعلان‌های حساب</span>
            <h1>سوابق اقدامات من و پیگیری پروژه‌ها</h1>
            <p>
              در این صفحه می‌توانید تمام سوابق خرید و فروش سهام، سفارش‌های بازار ثانویه، واریزی‌های کیف پول اجاره و تنظیمات اطلاع‌رسانی حساب خود را مشاهده و مدیریت کنید.
            </p>
          </div>
        </section>
        <section className="section shell" style={{ paddingTop: 28, paddingBottom: 80 }}>
          <AutoInvestPanel />
        </section>
      </main>
      <Footer />
    </>
  );
}
