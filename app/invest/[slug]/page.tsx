import { getCurrentActor, getProjectActor } from "@/lib/control";
import { getProjectBundle } from "@/lib/projects-server";
import { notFound } from "next/navigation";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { InvestmentRequestForm } from "../../components/InvestmentRequestForm";
import { properties, formatToman } from "@/lib/data";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return properties.map((property) => ({ slug: property.slug }));
}

export default async function InvestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const actor = await getCurrentActor();
  if (actor && !(await getProjectActor(actor, slug))) notFound();
  const property = (await getProjectBundle(slug))?.property;
  if (!property) notFound();
  const unitPrice = property.tokenPriceCurrent || property.tokenPriceInitial || 500_000;

  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <Link href={`/projects/${property.slug}`} className="inline-link">
              <ArrowRight size={15} /> بازگشت به جزئیات پروژه
            </Link>
            <span className="mini-label">خرید مستقیم سهام پروژه</span>
            <h1>{property.name}</h1>
            <p>فرآیند سه‌مرحله‌ای انتخاب تعداد سهام، تأیید ضوابط و ثبت آنی دارایی در پرتفوی شما.</p>
          </div>
        </section>
        <section className="investment-page shell">
          <div className="investment-side">
            <span className="mini-label">خلاصهٔ اطلاعات مالی</span>
            <h2>مشخصات عرضهٔ سهام</h2>
            <dl>
              <div>
                <dt>وضعیت پروژه</dt>
                <dd>{property.status}</dd>
              </div>
              <div>
                <dt>سطح ریسک ارزیابی‌شده</dt>
                <dd>{property.riskLevel}</dd>
              </div>
              <div>
                <dt>قیمت فعلی هر سهم</dt>
                <dd>{formatToman(unitPrice)} تومان</dd>
              </div>
              <div>
                <dt>بازده پایهٔ برآوردی</dt>
                <dd>{property.estimatedReturnBase}٪</dd>
              </div>
            </dl>
            <div className="risk-callout">
              <ShieldCheck size={18} />
              <p>
                پس از تکمیل خرید، سهام بلافاصله به پرتفوی شما منتقل شده و در هر زمان در تابلوی بازار ثانویهٔ خشت قابل فروش است.
              </p>
            </div>
            <Link href={`/projects/${property.slug}/documents`} className="inline-link">
              <FileText size={15} /> مطالعهٔ اتاق اسناد پروژه
            </Link>
          </div>
          <InvestmentRequestForm property={property} />
        </section>
      </main>
      <Footer />
    </>
  );
}
