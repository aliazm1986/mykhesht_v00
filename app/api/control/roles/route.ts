import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userProfiles } from "@/db/schema";
import { appRoles, getCurrentActor, logAuditEvent } from "@/lib/control";

export const dynamic = "force-dynamic";

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) return json({ error: "ورود به پایلوت لازم است." }, 401);
  if (actor.role !== "admin") return json({ error: "مدیریت نقش‌ها فقط برای مدیر مجاز است." }, 403);
  const profiles = await getDb().select({ userId: userProfiles.userId, email: userProfiles.email, displayName: userProfiles.displayName, role: userProfiles.role, updatedAt: userProfiles.updatedAt }).from(userProfiles).orderBy(asc(userProfiles.displayName));
  return json({ profiles, availableRoles: appRoles });
}

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return json({ error: "ورود به پایلوت لازم است." }, 401);
  if (actor.role !== "admin") return json({ error: "مدیریت نقش‌ها فقط برای مدیر مجاز است." }, 403);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "درخواست معتبر نیست." }, 400); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : null;
  if (!input || typeof input.userId !== "string" || input.userId.length < 8) return json({ error: "کاربر معتبر نیست." }, 400);
  if (typeof input.role !== "string" || !(appRoles as readonly string[]).includes(input.role)) return json({ error: "نقش معتبر نیست." }, 400);
  const profile = await getDb().select().from(userProfiles).where(eq(userProfiles.userId, input.userId)).limit(1);
  if (!profile[0]) return json({ error: "این کاربر هنوز یک‌بار وارد سایت نشده است." }, 404);
  if (input.userId === actor.userId && input.role !== "admin") return json({ error: "برای جلوگیری از قفل‌شدن مدیریت، نقش حساب مدیر جاری قابل کاهش نیست." }, 409);
  await getDb().update(userProfiles).set({ role: input.role, updatedAt: Date.now() }).where(eq(userProfiles.userId, input.userId));
  await logAuditEvent({ actorId: actor.userId, action: "access.role_updated", targetType: "user_profile", targetId: input.userId, payload: { role: input.role } });
  return json({ userId: input.userId, role: input.role });
}
