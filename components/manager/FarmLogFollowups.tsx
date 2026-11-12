"use client";

import {useEffect, useRef, useState} from "react";
import {ListTodo} from "lucide-react";
import {z} from "zod";
import {useAuth} from "@/contexts/AuthContext";
import {useManagerFetch, useManagerPeriod} from "@/contexts/ManagerPeriodContext";
import {useFarmRecordRefresh} from "@/hooks/useFarmRecordRefresh";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {farmManagerPrefix} from "@/lib/dashboard-navigation";
import {areaTitle, reportArea} from "@/lib/farm-report-areas";
import {farmTimestamp} from "@/lib/farm-products";
import {completeLogFollowup} from "@/lib/farm-record-messages";

const PAGE_SIZE = 20;
const inbox = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(z.object({
    message_id: z.string().uuid(), record_id: z.string().uuid(),
    resource: z.enum(["farm_daily_reports", "farm_batch_records"]),
    body: z.string(), created_at: z.string(),
    report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), area: z.string().nullable(),
    batch_name: z.string().nullable(), batch_id: z.string().uuid().nullable(),
  })),
});
type InboxPage = z.infer<typeof inbox> & {offset: number};
type Item = InboxPage["items"][number];
const dateFormat = new Intl.DateTimeFormat("en-GB", {timeZone: "Africa/Lagos", dateStyle: "medium"});
const smallButton = "min-h-11 rounded-lg px-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50";

function recordLink(prefix: string, item: Item) {
  if (item.resource === "farm_daily_reports") {
    const query = new URLSearchParams({report_id: item.record_id, message_id: item.message_id});
    return `${prefix}/daily-report/history?${query}`;
  }
  const query = new URLSearchParams({record_id: item.record_id, date: item.report_date, message_id: item.message_id});
  if (item.batch_id) query.set("batch_id", item.batch_id);
  return `${prefix}/today?${query}`;
}

function recordLabel(item: Item) {
  const area = reportArea(item.area);
  const place = item.batch_name || (area && areaTitle(area));
  const day = new Date(item.report_date + "T12:00:00Z");
  const date = Number.isFinite(day.getTime()) ? dateFormat.format(day) : "Date unavailable";
  return [place || "Daily Log", date].join(" · ");
}

export function FarmLogFollowups({pathname, online}: {pathname: string; online: boolean}) {
  const scope = useManagerPeriod();
  const {profile} = useAuth();
  if (!scope || scope.business !== "farm" || scope.status !== "active" || scope.mode === "admin_all" ||
      !profile || profile.suspended || profile.role !== "manager" || profile.id !== scope.actorId || scope.managerId !== profile.id) return null;
  return <Inbox key={`${scope.actorId}:${scope.periodId ?? "legacy"}`} prefix={farmManagerPrefix(pathname)} online={online}/>;
}

function Inbox({prefix, online}: {prefix: string; online: boolean}) {
  const send = useManagerFetch();
  const revision = useFarmRecordRefresh();
  const [page, setPage] = useState<InboxPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [readError, setReadError] = useState("");
  const [writeError, setWriteError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const requestIds = useRef(new Map<string, string>());
  const busy = useRef(false);
  const generation = useRef(0);

  // Invalidate in-flight reads immediately if a completion request reports lost access.
  function clearAccess() {
    generation.current++;
    setPage(null);
    setWriteError("");
    setReadError("Access to these follow-ups has changed. Check again after signing in.");
    requestIds.current.clear();
  }

  useEffect(() => {
    if (!online) return;
    const controller = new AbortController();
    const current = ++generation.current;
    async function load() {
      try {
        const response = await send(`/api/farm/log-followups?offset=${offset}`, {signal: controller.signal});
        if (controller.signal.aborted || current !== generation.current) return;
        if (response.status === 401 || response.status === 403) { clearAccess(); return; }
        if (!response.ok) throw Error();
        const result = inbox.parse(await response.json());
        if (controller.signal.aborted || current !== generation.current) return;
        setPage({...result, offset});
        setReadError("");
      } catch {
        if (!controller.signal.aborted && current === generation.current) setReadError("Couldn't refresh follow-ups.");
      }
    }
    void load();
    return () => controller.abort();
  }, [send, online, offset, revision, retry]);

  useEffect(() => {
    if (page && page.offset === offset && offset > 0 && offset >= page.total) {
      setOffset(Math.floor(Math.max(0, page.total - 1) / PAGE_SIZE) * PAGE_SIZE);
    }
  }, [page, offset]);

  async function markDone(messageId: string) {
    if (!online || busy.current) return;
    busy.current = true;
    setSaving(messageId);
    setWriteError("");
    let lostAccess = false;
    try {
      const requestId = requestIds.current.get(messageId) ?? crypto.randomUUID();
      requestIds.current.set(messageId, requestId);
      await completeLogFollowup(async (input, init) => {
        const response = await send(input, init);
        if (response.status === 401 || response.status === 403) { lostAccess = true; clearAccess(); }
        return response;
      }, messageId, requestId);
      generation.current++;
      requestIds.current.delete(messageId);
      setPage(previous => previous?.items.some(item => item.message_id === messageId) ? {
        ...previous, total: previous.total - 1, items: previous.items.filter(item => item.message_id !== messageId),
      } : previous);
    } catch {
      if (!lostAccess) setWriteError("Couldn't confirm completion. Try Mark done again.");
    } finally {
      busy.current = false;
      setSaving(null);
    }
  }

  const visiblePage = page?.offset === offset ? page : null;
  return <div className="mb-3">
    <Dialog onOpenChange={open => {if (open && online) {setOffset(0); setRetry(n => n + 1);}}}>
      <DialogTrigger asChild>
        <button type="button" className="flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-left text-sm font-semibold text-emerald-950 hover:bg-emerald-50">
          <ListTodo size={18} aria-hidden="true"/>
          Daily Log follow-ups
          <span aria-live="polite" className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
            {page ? `${page.total} to do${!online ? " · Offline" : readError ? " · Refresh needed" : ""}` : !online ? "Offline" : readError ? "Unavailable" : "Checking…"}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Daily Log follow-ups</DialogTitle>
          <DialogDescription>Messages from the MD/Owner about your Daily Logs.</DialogDescription>
        </DialogHeader>
        {!online && <p role="status" className="text-sm text-amber-800">Offline. Reconnect to see updates and mark work done.</p>}
        {online && readError && <div role="alert" className="text-sm text-amber-900">{readError} <button type="button" className={smallButton} onClick={() => setRetry(n => n + 1)}>Try again</button></div>}
        {writeError && <p role="alert" className="text-sm text-red-700">{writeError}</p>}
        {online && !visiblePage && !readError && <p role="status" className="text-sm">Checking follow-ups…</p>}
        {visiblePage?.total === 0 && <p className="text-sm text-slate-600">All caught up.</p>}
        {visiblePage && visiblePage.items.length > 0 && <ul className="space-y-2">
          {visiblePage.items.map(item => <li key={item.message_id} className="min-w-0 rounded-xl border p-3">
            <p className="whitespace-pre-wrap break-words text-sm font-semibold text-slate-900">{item.body}</p>
            <p className="mt-1 break-words text-xs text-slate-600">{recordLabel(item)}</p>
            <p className="mt-1 text-xs text-slate-600">Sent <time dateTime={item.created_at}>{farmTimestamp(item.created_at)}</time></p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
              <a className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline" href={recordLink(prefix, item)}>Open message</a>
              <button type="button" disabled={!online || !!saving} onClick={() => void markDone(item.message_id)} className={smallButton}>{saving === item.message_id ? "Saving…" : "Mark done"}</button>
            </div>
          </li>)}
        </ul>}
        {page && page.total > PAGE_SIZE && <nav aria-label="Follow-up pages" className="flex flex-wrap items-center justify-between text-sm">
          <button type="button" disabled={!online || offset === 0} className={smallButton} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</button>
          <span>{1 + Math.floor(offset / PAGE_SIZE)} of {Math.ceil(page.total / PAGE_SIZE)}</span>
          <button type="button" disabled={!online || offset + PAGE_SIZE >= page.total} className={smallButton} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button>
        </nav>}
      </DialogContent>
    </Dialog>
  </div>;
}
