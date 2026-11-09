import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { MarketBoard } from "../components/MarketBoard";

export const dynamic = "force-dynamic";

export default function MarketPage() {
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">بازار معاملات و نقدشوندگی خشت</span>
            <h1>خرید و فروش سهام و بازار ثانویه</h1>
            <p>
              سهام پروژه‌های ملکی را مستقیماً از عرضهٔ اولیه خریداری کنید یا دارایی‌های خود را در تابلوی بازار ثانویه برای فروش و معاملهٔ آنی با سایر سرمایه‌گذاران ثبت نمایید.
            </p>
          </div>
        </section>
        <section className="listing-section shell">
          <MarketBoard />
        </section>
      </main>
      <Footer />
    </>
  );
}
