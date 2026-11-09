import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { LegalDisclaimer } from "../components/LegalDisclaimer";
import { WealthManagementStudio } from "../components/WealthManagementStudio";
import {listProjectDefinitions,toProject,toProfile} from "@/lib/projects-server";
import { getCurrentActor,allowedProjectSlugs } from "@/lib/control";
export const dynamic="force-dynamic";

export default async function WealthPage() {
  const actor=await getCurrentActor(),allowed=actor?await allowedProjectSlugs(actor):null;
  const entries=(await listProjectDefinitions()).filter(p=>allowed===null||allowed.includes(p.definition.slug));
  return (
    <>
      <Header />
      <main className="wealth-page shell">
        <WealthManagementStudio properties={entries.map(p=>toProject(p.definition))} projectProfiles={Object.fromEntries(entries.map(p=>[p.definition.slug,toProfile(p.definition)]))} />
        <LegalDisclaimer className="wealth-disclaimer" />
      </main>
      <Footer />
    </>
  );
}
