import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { dataRoomDocuments } from "@/db/schema";
import { getProjectActor, canViewAccessLevel, getCurrentActor } from "@/lib/control";

export const dynamic = "force-dynamic";

type RuntimeBindings = { BUCKET?: R2Bucket };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor = await getCurrentActor();
  if (!actor) return Response.json({ error: "ورود به پایلوت لازم است." }, { status: 401 });
  const { id } = await params;
  const rows = await getDb().select().from(dataRoomDocuments).where(eq(dataRoomDocuments.id, id)).limit(1);
  const document = rows[0];
  actor=document?await getProjectActor(actor,document.projectSlug):null;
  if(!actor)return Response.json({error:"سند در دسترس نیست."},{status:404});
  if (!document) return Response.json({ error: "سند پیدا نشد." }, { status: 404 });
  if (!canViewAccessLevel(actor.role, document.accessLevel)) return Response.json({ error: "اجازهٔ دریافت این سند را ندارید." }, { status: 403 });
  const bucket = (env as unknown as RuntimeBindings).BUCKET;
  if (!bucket) return Response.json({ error: "فضای نگهداری فایل در دسترس نیست." }, { status: 503 });
  const object = await bucket.get(document.storageKey);
  if (!object) return Response.json({ error: "فایل اصلی در فضای خصوصی پیدا نشد." }, { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType || document.mimeType,
      "content-disposition": "attachment",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
