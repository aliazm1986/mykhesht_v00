import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PropertyFilters } from "../components/PropertyFilters";
import { LegalDisclaimer } from "../components/LegalDisclaimer";
import { listProjectDefinitions, toProject } from "@/lib/projects-server";
import { getCurrentActor,allowedProjectSlugs } from "@/lib/control";
import Link from 'next/link';
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const actor=await getCurrentActor(),allowed=actor?await allowedProjectSlugs(actor):[];
  const properties=(await listProjectDefinitions()).filter(p=>allowed===null||allowed.includes(p.definition.slug)).map(p=>toProject(p.definition));
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">کتابخانهٔ پرونده‌های پایلوت</span>
            <h1>پروندهٔ مناسب برای بررسی را پیدا کن.</h1>
            <p>فیلتر کن، مقایسه کن و پیش از هر تصمیم، کیفیت داده، اتاق اسناد، گزارش نمونه و گیت بعدی را ببین.</p>
          </div>
        </section>
        <section className="listing-section shell">
          <LegalDisclaimer />
          {!actor ? <div className="empty-state"><h2>برای مشاهدهٔ پرونده‌های مجاز وارد شوید.</h2><Link className="button button-red" href="/auth">ورود به حساب</Link></div> : !properties.length ? <div className="empty-state"><h2>هنوز پرونده‌ای به حساب شما اختصاص داده نشده است.</h2><p>مدیر باید عضویت شما را برای پروندهٔ موردنظر ثبت کند.</p><Link className="inline-link" href="/support">پیگیری دسترسی</Link></div> : <PropertyFilters properties={properties} />}
        </section>
      </main>
      <Footer />
    </>
  );
}
