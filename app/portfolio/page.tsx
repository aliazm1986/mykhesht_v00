import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PortfolioTabs } from "../components/PortfolioTabs";
import { LegalDisclaimer } from "../components/LegalDisclaimer";
import {getWorkspaceSummary}from"@/lib/workspace-server";
export const dynamic="force-dynamic";

export default async function PortfolioPage() {
  const summary=await getWorkspaceSummary();
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">پرونده‌های مورد پیگیری شما</span>
            <h1>هر پرونده، در مرحلهٔ خودش.</h1>
            <p>پرونده‌هایی که برایشان یادداشت یا تحلیل مالی ذخیره کرده‌اید، با آخرین وضعیت ثبت‌شده.</p>
          </div>
        </section>
        <section className="listing-section shell"><LegalDisclaimer /><PortfolioTabs records={summary?.records??[]} /></section>
      </main>
      <Footer />
    </>
  );
}
