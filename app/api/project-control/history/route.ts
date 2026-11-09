import { and,desc,eq,lt,or } from 'drizzle-orm';
import { getDb } from '@/db';
import { recordVersions,dataRoomDocuments } from '@/db/schema';
import { getCurrentActor,getProjectActor,canViewAccessLevel,canManageDataRoom,canReviewDocuments } from '@/lib/control';
const json=(v:unknown,s=200)=>Response.json(v,{status:s,headers:{'cache-control':'no-store'}});
export async function GET(request:Request){
 const a=await getCurrentActor();if(!a)return json({error:'ورود لازم است.'},401);
 const q=new URL(request.url).searchParams,slug=q.get('project'),actor=slug?await getProjectActor(a,slug):null;
 if(!slug||!actor)return json({error:'پرونده در دسترس نیست.'},404);
 if(!canManageDataRoom(actor.role)&&!canReviewDocuments(actor.role))return json({error:'اجازهٔ مشاهدهٔ تاریخچه ندارید.'},403);
 const docs=await getDb().select().from(dataRoomDocuments).where(eq(dataRoomDocuments.projectSlug,slug));
 function allowed(type:string,id:string){if(!['documentExtractions','dataRoomDocuments'].includes(type))return true;const d=docs.find(d=>d.id===id);return d&&canViewAccessLevel(actor!.role,d.accessLevel);}
 const id=q.get('id');
 if(id){const row=(await getDb().select().from(recordVersions).where(and(eq(recordVersions.id,id),eq(recordVersions.projectSlug,slug))).limit(1))[0];if(!row||!allowed(row.entityType,row.entityId))return json({error:'نسخه در دسترس نیست.'},404);return json({...row,snapshot:JSON.parse(row.snapshotJson)});}
 const cursor=q.get('before')?.split('.'),before=cursor&&cursor.length===2&&/^\d+$/.test(cursor[0])&&/^[a-f0-9]+$/.test(cursor[1])?cursor:null;
 const rows=await getDb().select({id:recordVersions.id,entityId:recordVersions.entityId,entityType:recordVersions.entityType,actorId:recordVersions.actorId,createdAt:recordVersions.createdAt}).from(recordVersions).where(and(eq(recordVersions.projectSlug,slug),before?or(lt(recordVersions.createdAt,Number(before[0])),and(eq(recordVersions.createdAt,Number(before[0])),lt(recordVersions.id,before[1]))):undefined)).orderBy(desc(recordVersions.createdAt),desc(recordVersions.id)).limit(51);
 return json({versions:rows.slice(0,50).filter(r=>allowed(r.entityType,r.entityId)),next:rows.length>50?`${rows[49].createdAt}.${rows[49].id}`:null});
}
