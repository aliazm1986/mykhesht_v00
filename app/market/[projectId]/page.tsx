import Link from "next/link";
import { getCurrentActor, getProjectActor } from "@/lib/control";
import { getProjectBundle } from "@/lib/projects-server";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { MarketBoard } from "../../components/MarketBoard";
import { properties, formatToman } from "@/lib/data";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return properties.map((property) => ({ projectId: property.slug }));
}

export default async function ProjectMarketPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const actor = await getCurrentActor();
  if (actor && !(await getProjectActor(actor, projectId))) notFound();
  const property = (await getProjectBundle(projectId))?.property;
  if (!property) notFound();

  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <Link href="/market" className="inline-link">
              <ArrowRight size={14} /> بازگشت به کل بازار ثانویه
            </Link>
            <div className="detail-meta" style={{ marginTop: 18 }}>
              <span>{property.type}</span>
              <i />
              <span>
                <MapPin size={12} /> {property.location}
              </span>
              <i />
              <span>{property.tokenSymbol || `KH-${property.slug.toUpperCase()}`}</span>
            </div>
            <h1>بازار ثانویه و خرید سهام {property.name}</h1>
            <p>
              قیمت فعلی هر سهم: {formatToman(property.tokenPriceCurrent || 525_000)} تومان · بازده پایهٔ برآوردی:{" "}
              {property.estimatedReturnBase}٪
            </p>
          </div>
        </section>
        <section className="listing-section shell">
          <MarketBoard project={property} />
        </section>
      </main>
      <Footer />
    </>
  );
}
