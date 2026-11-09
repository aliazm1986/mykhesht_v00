import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { pilotRecords } from "@/db/schema";
import { getProjectActor, getCurrentActor, projectFromSlug } from "@/lib/control";

export const dynamic = "force-dynamic";

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });

export async function GET(request: Request) {
  const user = await getCurrentActor();
  if (!user) return json({ error: "ورود به پایلوت لازم است." }, 401);
  const projectSlug = new URL(request.url).searchParams.get("project");
  if (!projectSlug || !await projectFromSlug(projectSlug)) return json({ error: "پرونده معتبر نیست." }, 400);
  if(!await getProjectActor(user,projectSlug))return json({error:"پرونده در دسترس نیست."},404);
  const records = await getDb().select().from(pilotRecords)
    .where(and(eq(pilotRecords.ownerId, user.userId), eq(pilotRecords.projectSlug, projectSlug)))
    .orderBy(desc(pilotRecords.createdAt)).limit(50);
  return json({ records });
}

export async function POST(request: Request) {
  const user = await getCurrentActor();
  if (!user) return json({ error: "ورود به پایلوت لازم است." }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "درخواست معتبر نیست." }, 400); }
  if (!body || typeof body !== "object") return json({ error: "درخواست معتبر نیست." }, 400);
  const input = body as Record<string, unknown>;
  if (typeof input.projectSlug !== "string" || !await projectFromSlug(input.projectSlug)) return json({ error: "پرونده معتبر نیست." }, 400);
  if(!await getProjectActor(user,input.projectSlug))return json({error:"پرونده در دسترس نیست."},404);
  if (input.kind !== "interest" && input.kind !== "review") return json({ error: "نوع رکورد معتبر نیست." }, 400);
  if (typeof input.note !== "string" || input.note.trim().length < 2 || input.note.length > 500) return json({ error: "یادداشت باید بین ۲ تا ۵۰۰ نویسه باشد." }, 400);
  const record = {
    id: crypto.randomUUID(), ownerId: user.userId, projectSlug: input.projectSlug,
    kind: input.kind, note: input.note.trim(), createdAt: Date.now(),
  };
  await getDb().insert(pilotRecords).values(record);
  return json({ record }, 201);
}
