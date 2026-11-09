import {notFound} from 'next/navigation';
import {getCurrentActor,getProjectActor} from '@/lib/control';
import {getProjectBundle} from '@/lib/projects-server';
import {ProjectEditor} from '@/app/components/ProjectEditor';
import {Header} from '@/app/components/Header';
import {Footer} from '@/app/components/Footer';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{slug:string}>}){const{slug}=await params,actor=await getProjectActor(await getCurrentActor(),slug);if(!actor||!['admin','project_manager'].includes(actor.role))notFound();const b=await getProjectBundle(slug);if(!b)notFound();return <><Header/><main className="shell"><ProjectEditor definition={b.definition} revision={b.revision}/></main><Footer/></>;}
