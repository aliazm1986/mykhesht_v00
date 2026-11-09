"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ClipboardList, Send } from "lucide-react";

type RecordItem = { id: string; kind: "interest" | "review"; note: string; createdAt: number };

export function PilotRecordPanel({ projectSlug }: { projectSlug: string }) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/pilot/records?project=${encodeURIComponent(projectSlug)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("سوابق هنوز در دسترس نیستند.");
        return response.json() as Promise<{ records: RecordItem[] }>;
      }).then((data) => setRecords(data.records)).catch((error: Error) => setMessage(error.message));
  }, [projectSlug]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/pilot/records", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectSlug, kind: "review", note }),
      });
      const data = await response.json() as { record?: RecordItem; error?: string };
      if (!response.ok || !data.record) throw new Error(data.error || "ثبت نشد.");
      setRecords((current) => [data.record!, ...current]); setNote(""); setMessage("یادداشت در پروندهٔ خصوصی ثبت شد.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "خطا در ثبت"); }
    finally { setLoading(false); }
  }

  return <section className="pilot-record-panel">
    <div className="panel-title-row"><div><span className="mini-label">بک‌اند پایلوت خصوصی</span><h2>یادداشت‌های بررسی من</h2></div><ClipboardList size={22} /></div>
    <p>یادداشت‌ها برای حساب واردشده در این سایت ذخیره می‌شوند. این بخش تصویب قیمت، سفارش یا تخصیص نیست.</p>
    <form onSubmit={submit}><label htmlFor="pilot-note">یادداشت بررسی</label><textarea id="pilot-note" required minLength={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثلاً: بررسی وضعیت سند و برآورد هزینهٔ بازسازی لازم است." /><button className="button button-red" disabled={loading || note.trim().length < 2} type="submit"><Send size={15} /> ثبت یادداشت</button></form>
    {message && <p className="record-message" role="status">{message}</p>}
    <div className="record-list">{records.map((record) => <article key={record.id}><small>{new Date(record.createdAt).toLocaleString("fa-IR")}</small><p>{record.note}</p></article>)}{!records.length && <small>هنوز یادداشتی برای این پرونده ثبت نشده است.</small>}</div>
  </section>;
}
