import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { HomeInteractiveLanding } from "./components/HomeInteractiveLanding";
import { listProjectDefinitions, toProject } from "@/lib/projects-server";
import { properties as defaultProperties } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let activeProjects = defaultProperties;
  try {
    const defs = await listProjectDefinitions();
    if (defs.length > 0) {
      activeProjects = defs.map((d) => toProject(d.definition));
    }
  } catch {
    activeProjects = defaultProperties;
  }

  return (
    <>
      <Header />
      <main>
        <HomeInteractiveLanding initialProjects={activeProjects} />
      </main>
      <Footer />
    </>
  );
}
