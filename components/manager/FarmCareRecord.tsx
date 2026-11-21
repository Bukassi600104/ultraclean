"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useManagerFetch, useQueueIdentity } from "@/contexts/ManagerPeriodContext";
import { queueIdentityKey } from "@/lib/offline-storage";
import {
  CARE_RECORD_ACTIVITIES,
  CARE_RECORD_ACTIVITY_COLUMN,
  CARE_RECORD_COMPANY,
  CARE_RECORD_FIELDS,
  CARE_RECORD_INSTRUCTIONS,
  CARE_RECORD_NOTE_LIMIT,
  CARE_RECORD_PAGE_SIZE,
  CARE_RECORD_REVIEW,
  CARE_RECORD_STATUS,
  CARE_RECORD_TEXT_LIMIT,
  CARE_RECORD_TITLE,
  careRecordPageSchema,
  careRecordReceiptSchema,
  careRecordWriteSchema,
  type CareRecordPage,
  type CareRecordRow,
  type CareRecordWrite,
} from "@/lib/farm-care-record";

const endpoint = "/api/farm/health/record";
const buttonBase = "min-h-11 rounded-lg border px-3 text-sm font-semibold disabled:opacity-50";
const button = buttonBase + " border-[#cbd5ca] bg-white text-[#244536]";
const primary = buttonBase + " border-emerald-900 bg-emerald-900 text-white";
const field = "block min-h-11 w-full min-w-0 rounded-lg border border-[#cbd5ca] bg-white px-3 py-2 text-base text-[#18271f]";
const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

type Editor = Omit<CareRecordRow, "row_number"> & { row_number: number | null; dirty?: boolean };
type ReviewDraft = { text: string; revision: number };
type Pending = { request: CareRecordWrite; copyActivity?: string };
type ScopedPending = { key: string; value: Pending | null };

function dateLabel(value: string) {
  return dateFormat.format(new Date(value + "T12:00:00Z"));
}

function pendingFromStorage(key: string): Pending | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    const request = careRecordWriteSchema.safeParse(saved?.request);
    if (request.success) {
      const copyActivity = request.data.operation === "add_page" && typeof saved.copyActivity === "string"
        ? saved.copyActivity.slice(0, CARE_RECORD_TEXT_LIMIT)
        : undefined;
      return { request: request.data, copyActivity };
    }
  } catch {
    // The workspace can still open if this device has disabled local storage.
  }
  return null;
}

function newRow(activity = ""): Editor {
  return { row_number: null, activity, values: {}, revision: 0 };
}

export function FarmCareRecord() {
  const send = useManagerFetch();
  const identity = useQueueIdentity();
  const storageKey = identity ? "farm-care-record-save:" + queueIdentityKey(identity) : "";
  const [pendingState, setPending] = useState<ScopedPending | null>(null);
  const pending = pendingState?.key === storageKey ? pendingState.value : null;
  const [page, setPage] = useState(1);
  const [register, setRegister] = useState<string | null>(null);
  const [data, setData] = useState<CareRecordPage | null>(null);
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});
  const [readError, setReadError] = useState("");
  const [writeError, setWriteError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const current = data?.page === page && (!register || register === data.register_id) ? data : null;
  const reviewKey = (current?.register_id ?? "") + ":" + page;
  const reviewDraft = reviewDrafts[reviewKey];
  const review = reviewDraft?.text ?? current?.review?.text ?? "";
  const ready = !storageKey || pendingState?.key === storageKey;
  const editable = Boolean(current?.can_write && current.register_id);
  const blocked = busy || Boolean(pending) || !ready;
  const rowsByNumber = new Map(current?.rows.map((row) => [row.row_number, row]));
  const savedEditor = editor?.row_number == null ? null : rowsByNumber.get(editor.row_number);
  const rowChanged = Boolean(current && editor && savedEditor && savedEditor.revision !== editor.revision);
  const reviewChanged = Boolean(current && reviewDraft && reviewDraft.revision !== (current.review?.revision ?? 0));
  const rows: CareRecordRow[] = page === 1 ? CARE_RECORD_ACTIVITIES.map((activity, index) =>
    rowsByNumber.get(index + 1) ?? { row_number: index + 1, activity, values: {}, revision: 0 }) : current?.rows ?? [];

  useEffect(() => {
    setPending({ key: storageKey, value: storageKey ? pendingFromStorage(storageKey) : null });
  }, [storageKey]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page) });
    if (register) query.set("register_id", register);
    setReadError("");
    send(endpoint + "?" + query, { signal: controller.signal }).then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw Error(payload?.error || "The health record could not be loaded.");
      const result = careRecordPageSchema.safeParse(payload);
      if (!result.success || result.data.page !== page || (register && result.data.register_id !== register)) {
        throw Error("The health record could not be loaded.");
      }
      if (!controller.signal.aborted) setData(result.data);
    }).catch((error) => {
      if (!controller.signal.aborted) setReadError(error.message || "The health record could not be loaded.");
    });
    return () => controller.abort();
  }, [page, register, revision, send]);

  function remember(value: Pending | null) {
    setPending({ key: storageKey, value });
    if (!storageKey) return;
    try {
      if (value) localStorage.setItem(storageKey, JSON.stringify(value));
      else localStorage.removeItem(storageKey);
    } catch {
      // A retry is still available in this open tab.
    }
  }

  function openPage(nextPage: number, registerId = current?.register_id ?? null) {
    setRegister(registerId);
    setPage(nextPage);
    setNotice("");
    setWriteError("");
  }

  function openRow(row: Editor) {
    setWriteError("");
    setEditor(row);
  }

  async function save(item: Pending) {
    if (busyRef.current) return;
    const parsed = careRecordWriteSchema.safeParse(item.request);
    if (!parsed.success) {
      setWriteError("Enter an activity and at least one detail for this row, or check the review text.");
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setWriteError("");
    setNotice("");
    const request = parsed.data;
    remember({ ...item, request });
    try {
      const response = await send(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status < 500 && response.status !== 408) remember(null);
        if (response.status === 409) setRevision((value) => value + 1);
        throw Error(body?.error || "The save could not be confirmed. Please retry.");
      }
      const receipt = careRecordReceiptSchema.safeParse(body?.data);
      if (!receipt.success) throw Error("The save could not be confirmed. Please retry.");

      remember(null);
      if (request.operation === "save_review") {
        const savedKey = request.register_id + ":" + request.payload.page;
        setReviewDrafts((drafts) => {
          const remaining = { ...drafts };
          delete remaining[savedKey];
          return remaining;
        });
      }
      openPage(receipt.data.page, request.register_id);
      setRevision((value) => value + 1);
      setEditor(item.copyActivity ? newRow(item.copyActivity) : null);
      setNotice(request.operation === "add_page" ? "Page added." : request.operation === "save_row" ? "Row saved." : "Review saved.");
    } catch (error) {
      setWriteError(error instanceof Error ? error.message : "The save could not be confirmed. Please retry.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function addPage(copyActivity?: string) {
    if (!current?.register_id || !editable || blocked) return;
    return save({ request: {
      operation: "add_page", request_id: crypto.randomUUID(), register_id: current.register_id, payload: {},
    }, copyActivity });
  }

  async function copyRow(activity: string) {
    if (!current?.register_id || !editable || blocked || busyRef.current) return;
    if (page > 1 && current.rows.length < CARE_RECORD_PAGE_SIZE) {
      openRow(newRow(activity));
      return;
    }

    if (current.page_count > page) {
      busyRef.current = true;
      setBusy(true);
      try {
        const target = current.page_count;
        const query = new URLSearchParams({ page: String(target), register_id: current.register_id });
        const response = await send(endpoint + "?" + query);
        const result = careRecordPageSchema.safeParse(await response.json().catch(() => null));
        if (!response.ok || !result.success || result.data.page !== target || result.data.register_id !== current.register_id) {
          throw Error("The continuation page could not be opened. Please retry.");
        }
        if (result.data.rows.length < CARE_RECORD_PAGE_SIZE) {
          openPage(target);
          setData(result.data);
          openRow(newRow(activity));
          return;
        }
      } catch (error) {
        setWriteError(error instanceof Error ? error.message : "The continuation page could not be opened. Please retry.");
        return;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    }
    await addPage(activity);
  }

  function saveRow(record: Editor) {
    if (!current?.register_id || !editable || blocked || rowChanged) return;
    const values = Object.fromEntries(Object.entries(record.values)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value.length > 0));
    if (!Object.keys(values).length) {
      setWriteError("Enter at least one detail for this row.");
      return;
    }
    void save({ request: {
      operation: "save_row",
      request_id: crypto.randomUUID(),
      register_id: current.register_id,
      payload: {
        page, row_number: record.row_number, activity: record.activity,
        values, expected_revision: record.revision,
      },
    } });
  }

  function saveReview() {
    if (!current?.register_id || !editable || blocked || reviewChanged) return;
    void save({ request: {
      operation: "save_review",
      request_id: crypto.randomUUID(),
      register_id: current.register_id,
      payload: { page, text: review, expected_revision: reviewDraft?.revision ?? current.review?.revision ?? 0 },
    } });
  }

  function feedback() {
    return <>
      {writeError && <p role="alert" className="text-sm text-red-800">{writeError}</p>}
      {pending && !busy && <div className="flex flex-wrap items-center gap-2 text-sm">
        <p>Confirm the previous save before entering another record.</p>
        <button type="button" className={button} onClick={() => void save(pending)}>Retry save</button>
      </div>}
    </>;
  }

  return <section aria-labelledby="farm-care-record-title" className="min-w-0 space-y-4 rounded-xl border border-[#cbd5ca] bg-white p-3 sm:p-4">
    <header className="space-y-1">
      <p className="text-sm font-semibold text-[#395545]">{CARE_RECORD_COMPANY}</p>
      <h2 id="farm-care-record-title" className="text-xl font-bold">{CARE_RECORD_TITLE}</h2>
      <p className="text-sm">{CARE_RECORD_INSTRUCTIONS}</p>
    </header>
    {!editor && feedback()}
    {notice && <p role="status" className="text-sm font-semibold text-emerald-900">{notice}</p>}
    {readError && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-800">
      <p>{readError}</p>
      <button type="button" className={button} onClick={() => setRevision((value) => value + 1)}>Refresh record</button>
    </div>}
    {!current && !readError && <p role="status" className="text-sm">Loading health record…</p>}
    {current && <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        {current.registers.length > 1 && <label className="min-w-0 text-sm font-semibold">
          Supervisor period
          <select className={field} value={current.register_id ?? ""} disabled={blocked}
            onChange={(event) => openPage(1, event.target.value)}>
            {current.registers.map((period) => <option key={period.id} value={period.id}>
              {period.manager_name} · {period.starts_on ? dateLabel(period.starts_on) : "Start date pending"}{period.ends_on ? " to " + dateLabel(period.ends_on) : ""}
            </option>)}
          </select>
        </label>}
        <div className="flex flex-wrap items-center gap-2">
          <span className="pr-1 text-sm font-semibold">Page {page} of {current.page_count}</span>
          <button type="button" className={button} onClick={() => openPage(page - 1)} disabled={blocked || page <= 1}>Previous page</button>
          <button type="button" className={button} onClick={() => openPage(page + 1)} disabled={blocked || page >= current.page_count}>Next page</button>
          {editable && <button type="button" className={button} onClick={() => void addPage()} disabled={blocked || Boolean(readError)}>Add page</button>}
          {editable && page > 1 && rows.length < CARE_RECORD_PAGE_SIZE &&
            <button type="button" className={primary} onClick={() => openRow(newRow())} disabled={blocked || Boolean(readError)}>Add row</button>}
        </div>
      </div>
      {!current.register_id && <p className="text-sm">The register is available when a farm supervisor period is set up.</p>}
      <div role="region" aria-label="Scrollable health record columns" tabIndex={0}
        className="max-h-[28rem] max-w-full overflow-auto rounded-lg border border-[#cbd5ca] focus-visible:outline-emerald-800">
        <table aria-label={CARE_RECORD_TITLE} className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-20 bg-[#e3ece4]">
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-12 min-w-12 border-b bg-[#e3ece4] px-2 py-2">No.</th>
              <th scope="col" className="sticky left-12 z-10 w-36 min-w-36 border-b bg-[#e3ece4] px-2 py-2 sm:w-48 sm:min-w-48">{CARE_RECORD_ACTIVITY_COLUMN}</th>
              {CARE_RECORD_FIELDS.map(([key, label]) => <th scope="col" key={key} className="w-36 min-w-36 border-b px-2 py-2">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => <tr key={row.row_number}>
              <td className="sticky left-0 z-10 border-b bg-white px-2 align-top leading-[2.75rem]">{(page - 1) * CARE_RECORD_PAGE_SIZE + row.row_number}</td>
              <th scope="row" className="sticky left-12 z-10 border-b border-r bg-white px-2 py-1 font-semibold">
                {editable || row.revision > 0 ? <button type="button" className="min-h-11 w-full break-words text-left text-emerald-900 underline disabled:text-slate-600"
                  onClick={() => openRow(row)} disabled={blocked}>{row.activity}</button> : row.activity}
              </th>
              {CARE_RECORD_FIELDS.map(([key, , type]) => <td key={key} className="whitespace-pre-wrap break-words border-b px-2 py-2 align-top">
                {row.values[key] && (type === "date" ? dateLabel(row.values[key]) : row.values[key])}
              </td>)}
            </tr>)}
            {rows.length === 0 && <tr><td colSpan={CARE_RECORD_FIELDS.length + 2} className="px-2 py-3">No entries on this page.</td></tr>}
          </tbody>
        </table>
      </div>
      <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); saveReview(); }}>
        <label className="block text-base font-bold" htmlFor="farm-care-record-review">{CARE_RECORD_REVIEW}</label>
        <textarea id="farm-care-record-review" className={field} rows={3} maxLength={CARE_RECORD_NOTE_LIMIT} value={review}
          readOnly={!editable || blocked} onChange={(event) => {
            const text = event.target.value;
            setReviewDrafts((drafts) => ({
              ...drafts, [reviewKey]: { text, revision: drafts[reviewKey]?.revision ?? current.review?.revision ?? 0 },
            }));
          }}/>
        {reviewChanged && <button type="button" className={button} onClick={() => {
          setReviewDrafts((drafts) => {
            const remaining = { ...drafts };
            delete remaining[reviewKey];
            return remaining;
          });
          setWriteError("");
        }}>Load saved review</button>}
        {editable && <button type="submit" className={button}
          disabled={blocked || Boolean(readError) || reviewChanged || !review.trim() || review.trim() === current.review?.text}>Save review</button>}
      </form>
    </>}
    <Dialog open={!!editor} onOpenChange={(open) => { if (!open && !busy) { setEditor(null); setWriteError(""); } }}>
      {editor && <DialogContent className="max-w-2xl p-4 sm:p-6"
        onInteractOutside={(event) => { if (editor.dirty || busy) event.preventDefault(); }}>
        <DialogTitle className="pr-12 leading-tight">{editor.row_number === null ? "Add row" : editor.activity}</DialogTitle>
        <DialogDescription>{CARE_RECORD_TITLE} · Page {page}</DialogDescription>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); saveRow(editor); }}>
          <label className="block text-sm font-semibold">
            {CARE_RECORD_ACTIVITY_COLUMN}
            <input className={field} value={editor.activity} maxLength={CARE_RECORD_TEXT_LIMIT} required
              readOnly={!editable || blocked || editor.row_number !== null}
              onChange={(event) => setEditor({ ...editor, activity: event.target.value, dirty: true })} />
          </label>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {CARE_RECORD_FIELDS.map(([key, label, type]) => {
              const value = editor.values[key] ?? "";
              const input = {
                className: field,
                value,
                onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                  setEditor({ ...editor, values: { ...editor.values, [key]: event.target.value }, dirty: true }),
              };
              return <label key={key} className="block min-w-0 text-sm font-semibold">
                {label}
                {type === "textarea" ? <textarea {...input} rows={2} maxLength={CARE_RECORD_NOTE_LIMIT} readOnly={!editable || blocked} />
                  : type === "select" ? <select {...input} disabled={!editable || blocked}>
                      <option value=""></option>
                      {CARE_RECORD_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    : <input {...input} type={type} maxLength={CARE_RECORD_TEXT_LIMIT} readOnly={!editable || blocked} />}
              </label>;
            })}
          </div>
          {feedback()}
          {editable && <div className="flex flex-wrap justify-end gap-2">
            {rowChanged && savedEditor && <button type="button" className={button}
              onClick={() => openRow(savedEditor)}>Load saved row</button>}
            {editor.row_number !== null && <button type="button" className={button} onClick={() => void copyRow(editor.activity)}
              disabled={blocked || Boolean(readError) || editor.dirty}>Copy row</button>}
            <button type="submit" className={primary} disabled={blocked || Boolean(readError) || rowChanged}>{busy ? "Saving…" : "Save row"}</button>
          </div>}
        </form>
      </DialogContent>}
    </Dialog>
  </section>;
}
