import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { TierSelector } from "../components/TierSelector";
import { LegalDisclaimer } from "../components/LegalDisclaimer";

export default function TiersPage() {
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">سطوح دسترسی سرمایه‌گذاران</span>
            <h1>سطح کاربری و دسترسی به اتاق اسناد</h1>
            <p>
              سطح کاربری خود را انتخاب کنید تا دسترسی به لایه‌های مختلف اسناد فنی، مالی و حقوقی در اتاق دادهٔ پروژه‌ها تنظیم شود.
            </p>
          </div>
        </section>
        <section className="listing-section shell">
          <LegalDisclaimer />
          <TierSelector />
        </section>
      </main>
      <Footer />
    </>
  );
}
