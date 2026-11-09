import { localAuthEnabled, localUser } from "./local-auth";
import { env } from "cloudflare:workers";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

function isSameOrLoopbackOrigin(originHeader: string, requestUrl: string, requestHeaders?: Headers): boolean {
  const reqUrl = new URL(requestUrl);
  if (originHeader === reqUrl.origin) return true;
  try {
    const origUrl = new URL(originHeader);
    const origHost = origUrl.hostname.toLowerCase();
    const reqHost = reqUrl.hostname.toLowerCase();
    if (origHost === reqHost) return true;
    if (LOOPBACK_HOSTS.has(origHost) && LOOPBACK_HOSTS.has(reqHost)) return true;
    const forwardedHost = (requestHeaders?.get("x-forwarded-host") || requestHeaders?.get("host") || "")
      .split(",")[0]
      .trim()
      .split(":")[0]
      .toLowerCase();
    if (forwardedHost && origHost === forwardedHost) return true;
    return false;
  } catch {
    return false;
  }
}

export async function guardApiRequest(request: Request): Promise<Response | null> {
  const fail = (error: string, status: number, extra: Record<string, string> = {}) =>
    Response.json({ error, ok: false }, { status, headers: { "cache-control": "no-store", ...extra } });
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return null;
  if (request.headers.get("sec-fetch-site") === "cross-site") return fail("درخواست از مبدأ دیگر پذیرفته نمی‌شود.", 403);
  const origin = request.headers.get("origin");
  if (origin && !isSameOrLoopbackOrigin(origin, request.url, request.headers)) return fail("مبدأ درخواست معتبر نیست.", 403);
  const multipart = request.headers.get("content-type")?.startsWith("multipart/form-data");
  const limit = multipart ? 16 * 1024 * 1024 : 1024 * 1024;
  if (Number(request.headers.get("content-length")) > limit) return fail("درخواست بیش از حد بزرگ است.", 413);
  const identity = localAuthEnabled()
    ? (await localUser(request.headers.get("cookie")))?.userId
    : request.headers.get("oai-authenticated-user-id");
  if (request.body) {
    const reader = request.clone().body!.getReader();
    let bytes = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > limit) {
          void reader.cancel().catch(() => undefined);
          return fail("درخواست بیش از حد بزرگ است.", 413);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  if (!identity) return null; // Login routes apply their own persistent limit.
  if (!env.DB) return fail("پایگاه داده در دسترس نیست.", 503);
  const windowStart = Math.floor(Date.now() / 60_000);
  const key = `${identity}:${new URL(request.url).pathname.startsWith("/api/admin/backups") ? "backup" : "write"}`;
  const max = key.endsWith(":backup") ? 3 : 80;
  const row = await env.DB.prepare(
    "INSERT INTO request_limits (key, window_start, count) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END, window_start = excluded.window_start RETURNING count",
  )
    .bind(key, windowStart)
    .first<{ count: number }>();
  return row && row.count > max
    ? fail("تعداد درخواست‌ها زیاد است؛ یک دقیقه بعد دوباره تلاش کنید.", 429, { "retry-after": "60" })
    : null;
}
