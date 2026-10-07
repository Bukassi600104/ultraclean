"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isPropertySection, parsePropertyWrite, propertyKinds, PropertyRow, PropertySection, propertyMoney } from "@/lib/property";
import { usePropertyActor } from "@/components/property/PropertyShell";

type Field = {key: string; label: string; type?: "date" | "number" | "textarea"; options?: string[]; lookup?: PropertySection; optional?: boolean; fixed?: boolean; max?: number};
const fields: Record<PropertySection, Field[]> = {
  properties: [{key: "name", label: "Property name", max: 200}, {key: "address", label: "Address", type: "textarea", max: 1000}, {key: "currency", label: "Currency (three-letter code)", fixed: true, max: 3}, {key: "status", label: "Status", options: ["active", "inactive"]}],
  units: [{key: "property_id", label: "Property", lookup: "properties", fixed: true}, {key: "name", label: "Unit name", max: 200}, {key: "status", label: "Availability", options: ["vacant", "unavailable"]}],
  tenancies: [{key: "unit_id", label: "Unit", lookup: "units", fixed: true}, {key: "tenant_name", label: "Tenant name", max: 200}, {key: "tenant_contact", label: "Tenant contact", optional: true, max: 500}, {key: "start_date", label: "Tenancy start", type: "date"}, {key: "end_date", label: "Tenancy end", type: "date", optional: true}, {key: "rent_amount", label: "Agreed rent amount", type: "number"}, {key: "currency", label: "Currency", fixed: true}, {key: "status", label: "Tenancy status", options: ["active", "ended"]}],
  rent: [{key: "tenancy_id", label: "Tenancy", lookup: "tenancies", fixed: true}, {key: "amount", label: "Amount received", type: "number"}, {key: "currency", label: "Currency", fixed: true}, {key: "payment_date", label: "Payment date", type: "date"}, {key: "period_start", label: "Rent period starts", type: "date"}, {key: "period_end", label: "Rent period ends", type: "date"}, {key: "payment_method", label: "Payment method", max: 100}, {key: "notes", label: "Notes", type: "textarea", optional: true}],
  expenses: [{key: "property_id", label: "Property", lookup: "properties", fixed: true}, {key: "unit_id", label: "Unit (optional)", lookup: "units", optional: true}, {key: "category", label: "Expense category", max: 100}, {key: "amount", label: "Amount paid", type: "number"}, {key: "currency", label: "Currency", fixed: true}, {key: "expense_date", label: "Expense date", type: "date"}, {key: "notes", label: "Notes", type: "textarea", optional: true}],
  maintenance: [{key: "property_id", label: "Property", lookup: "properties", fixed: true}, {key: "unit_id", label: "Unit (optional)", lookup: "units", optional: true}, {key: "issue", label: "Issue", type: "textarea"}, {key: "category", label: "Work type", options: ["maintenance", "repair"]}, {key: "priority", label: "Priority", options: ["normal", "low", "high", "urgent"]}, {key: "status", label: "Work status", options: ["open", "in_progress", "resolved"]}, {key: "cost", label: "Work cost (optional)", type: "number", optional: true}, {key: "currency", label: "Currency", fixed: true}, {key: "resolution", label: "Resolution", type: "textarea", optional: true}],
};
type Data = Record<PropertySection, PropertyRow[]>;
type EventRow = {id: string; record_type: string; record_id: string; operation: string; actor_id: string; happened_at: string; reason: string | null; before_value: unknown; after_value: unknown; actor?: {name: string | null} | null};
const emptyData = (): Data => ({properties: [], units: [], tenancies: [], rent: [], expenses: [], maintenance: []});
const readable = (value: unknown) => String(value ?? "—").replaceAll("_", " ");
const inputClass = "mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-600";
function rowName(section: PropertySection, row: PropertyRow) {return String(section === "tenancies" ? row.tenant_name : section === "maintenance" ? row.issue : section === "rent" ? `Payment · ${row.payment_date}` : section === "expenses" ? row.category : row.name);}

export default function PropertyWorkspace({section}: {section: PropertySection | "overview" | "history"}) {
  const actorId = usePropertyActor();
  const pendingKey = actorId && isPropertySection(section) ? `bossbimbz-property-pending:${actorId}:${section}` : null;
  const [data, setData] = useState<Data>(emptyData), [history, setHistory] = useState<EventRow[]>([]), [historyPage, setHistoryPage] = useState(0), [historyMore, setHistoryMore] = useState(false);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(""), [saveError, setSaveError] = useState(""), [notice, setNotice] = useState(""), [saving, setSaving] = useState(false), [conflict, setConflict] = useState(false), [uncertain, setUncertain] = useState(false);
  const [editing, setEditing] = useState<PropertyRow | null>(null), [showForm, setShowForm] = useState(false), [values, setValues] = useState<Record<string, string>>({}), [reason, setReason] = useState(""), [filter, setFilter] = useState("all"), [search, setSearch] = useState("");
  const retry = useRef<{fingerprint: string; id: string} | null>(null);
  useEffect(() => {
    setShowForm(false);setEditing(null);setSaveError("");setNotice("");setConflict(false);setUncertain(false);setFilter("all");setSearch("");retry.current = null;
    if (!pendingKey || !isPropertySection(section)) return;
    try {
      const pending = JSON.parse(localStorage.getItem(pendingKey) || "null");
      if (!pending) return;
      parsePropertyWrite(section, {...JSON.parse(pending.retry.fingerprint), request_id: pending.retry.id});
      if (!pending.values || Object.values(pending.values).some(value => typeof value !== "string")) throw new Error("Invalid pending entry");
      setValues(pending.values);setEditing(pending.editing);setReason(pending.reason);retry.current = pending.retry;setUncertain(true);setShowForm(true);
      setSaveError("An unconfirmed submission was restored. Retry it to confirm the saved record before editing.");
    } catch {try {localStorage.removeItem(pendingKey);} catch {/* Browser storage may be unavailable; online forms remain usable. */}}
  }, [section, pendingKey]);
  const load = useCallback(async () => {
    setLoading(true);setLoadError("");
    try {
      if (section === "history") {
        const response = await fetch(`/api/property/history?page=${historyPage}`, {cache: "no-store"}), result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load activity history.");
        setHistory(result.data);setHistoryMore(result.has_more);
      } else {
        const lists = await Promise.all(Object.keys(propertyKinds).map(async key => {
          const all: PropertyRow[] = [];let page = 0, more = true;
          while (more) {
            const response = await fetch(`/api/property/${key}?page=${page}`, {cache: "no-store"}), result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unable to load property records.");
            all.push(...result.data);more = result.has_more;page++;
          }
          return [key, all] as const;
        }));
        setData(Object.fromEntries(lists) as Data);
      }
    } catch (failure) {setLoadError(failure instanceof Error ? failure.message : "Unable to load records. Please retry.");}
    finally {setLoading(false);}
  }, [section, historyPage]);
  useEffect(() => {void load();}, [load]);
  function start(row: PropertyRow | null) {
    if (!isPropertySection(section) || uncertain) return;
    const initial: Record<string, string> = {};
    fields[section].forEach(field => {initial[field.key] = row ? String(row[field.key] ?? "") : field.options?.[0] ?? "";});
    setValues(initial);setEditing(row);setReason("");setSaveError("");setNotice("");setConflict(false);setUncertain(false);retry.current = null;setShowForm(true);
    requestAnimationFrame(() => document.getElementById("property-form")?.scrollIntoView({behavior: "smooth", block: "start"}));
  }
  function change(field: Field, value: string) {
    setValues(previous => {
      const next = {...previous, [field.key]: field.key === "currency" ? value.toUpperCase() : value};
      if (field.key === "property_id") {next.unit_id = "";next.currency = String(data.properties.find(row => row.id === value)?.currency ?? "");}
      if (field.key === "unit_id" && section === "tenancies") {
        const unit = data.units.find(row => row.id === value), property = data.properties.find(row => row.id === unit?.property_id);
        next.currency = String(property?.currency ?? "");
      }
      if (field.key === "tenancy_id") next.currency = String(data.tenancies.find(row => row.id === value)?.currency ?? "");
      return next;
    });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();if (!isPropertySection(section) || saving || conflict) return;
    setSaving(true);setSaveError("");setNotice("");
    try {
      const payload: Record<string, unknown> = {};
      fields[section].forEach(field => {const value = values[field.key]?.trim() ?? "";payload[field.key] = field.optional && !value ? null : field.type === "number" ? Number(value) : value;});
      const body = {...payload, operation: editing ? "update" : "create", ...(editing ? {id: editing.id, expected_revision: editing.revision, reason} : {})};
      const fingerprint = JSON.stringify(body);
      if (!retry.current || retry.current.fingerprint !== fingerprint) retry.current = {fingerprint, id: crypto.randomUUID()};
      if (!pendingKey) throw new Error("The entry was not sent. Wait for your account to load, then retry.");
      try {localStorage.setItem(pendingKey, JSON.stringify({values, editing, reason, retry: retry.current}));}
      catch {throw new Error("The entry was not sent because device storage is unavailable. Your form is retained; enable storage and retry.");}
      const response = await fetch(`/api/property/${section}`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({...body, request_id: retry.current.id})});
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) {setConflict(true);void load();}
        if (response.status >= 500 || [401,403,429].includes(response.status)) setUncertain(true);
        else {setUncertain(false);if (pendingKey) {try {localStorage.removeItem(pendingKey);} catch {/* No pending server write remains. */}}}
        throw new Error(result.error || "Unable to save. Please retry.");
      }
      if (pendingKey) {try {localStorage.removeItem(pendingKey);} catch {/* The server receipt confirms this submission. */}}
      setShowForm(false);setEditing(null);setUncertain(false);retry.current = null;setNotice("Saved. The record and activity history have been updated.");await load();
    } catch (failure) {
      const unconfirmed = failure instanceof TypeError || failure instanceof SyntaxError;
      if (unconfirmed) setUncertain(true);
      setSaveError(unconfirmed || !(failure instanceof Error) ? "Save could not be confirmed. Your entry is retained; retry this submission before editing it." : failure.message);
    }
    finally {setSaving(false);}
  }
  function reference(field: Field, value: unknown) {
    if (!field.lookup || !value) return readable(value);
    const row = data[field.lookup].find(item => item.id === value);
    return row ? rowName(field.lookup, row) : String(value);
  }
  function options(field: Field) {
    let rows = field.lookup ? data[field.lookup] : [];
    if (field.lookup === "units" && values.property_id) rows = rows.filter(row => row.property_id === values.property_id);
    if (field.lookup === "units" && section === "tenancies" && !editing && values.status !== "ended") rows = rows.filter(row => row.status === "vacant");
    return rows;
  }
  const title = section === "overview" ? "Property overview" : section === "history" ? "Activity history" : propertyKinds[section].label;
  const rows = isPropertySection(section) ? data[section].filter(row => (filter === "all" || row.status === filter || row.category === filter) && Object.values(row).some(value => String(value ?? "").toLowerCase().includes(search.toLowerCase()))) : [];
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">{section === "history" ? "Every saved change retains its actor, time, reason and original values." : "Manage actual property records. Payments and expenses remain separate from maintenance estimates."}</p></div><div className="flex gap-2"><button onClick={() => void load()} disabled={loading || saving} className="min-h-11 rounded-lg border bg-white px-4 text-sm">{loading ? "Loading…" : "Refresh"}</button>{isPropertySection(section) && <button onClick={() => start(null)} disabled={loading || !!loadError || saving || uncertain} className="min-h-11 rounded-lg bg-[#0BBDB2] px-4 text-sm font-semibold text-slate-950 disabled:opacity-50">Add record</button>}</div></div>
    {loadError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError} Existing data has not been replaced with zero balances. Use Refresh to retry.</div>}
    {notice && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900">{notice}</p>}
    {loading && <p role="status" className="text-sm text-slate-600">Loading saved property records…</p>}
    {!loading && !loadError && section === "overview" && <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Properties", data.properties.length], ["Occupied units", data.units.filter(row => row.status === "occupied").length], ["Vacant units", data.units.filter(row => row.status === "vacant").length], ["Unavailable units", data.units.filter(row => row.status === "unavailable").length]].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</div>
      <section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">Recorded money · all dates</h2><p className="mt-1 text-sm text-slate-600">Received rent less recorded expenses, grouped by currency. Agreed rent and work costs are excluded from cash totals.</p>
        {!data.rent.length && !data.expenses.length ? <p className="mt-4 text-sm text-slate-500">No payments or expenses recorded yet.</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2">{Array.from(new Set([...data.rent, ...data.expenses].map(row => String(row.currency)))).sort().map(code => {
          const rent = data.rent.filter(row => row.currency === code).reduce((sum, row) => sum + Number(row.amount), 0), expenses = data.expenses.filter(row => row.currency === code).reduce((sum, row) => sum + Number(row.amount), 0);
          return <dl key={code} className="rounded-lg bg-slate-50 p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt>Rent received</dt><dd>{propertyMoney(rent, code)}</dd></div><div className="mt-2 flex flex-wrap justify-between gap-2"><dt>Expenses</dt><dd>{propertyMoney(expenses, code)}</dd></div><div className="mt-2 flex flex-wrap justify-between gap-2 font-semibold"><dt>Recorded net</dt><dd>{propertyMoney(rent - expenses, code)}</dd></div></dl>;
        })}</div>}
      </section>
      <section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">Maintenance & repairs</h2><p className="mt-2 text-sm">{data.maintenance.filter(row => row.status !== "resolved").length} open work items · {data.maintenance.filter(row => row.category === "repair" && row.status !== "resolved").length} open repairs</p><Link className="mt-3 inline-block rounded-lg px-3 py-3 text-sm font-medium text-teal-800 hover:bg-teal-50" href="/property/maintenance">View work records</Link></section>
      {!data.properties.length && <section className="rounded-xl border border-dashed bg-white p-6"><h2 className="font-semibold">Start with your first property</h2><p className="mt-2 text-sm text-slate-600">Add a property and its currency, then add units and their tenancies. No sample records are included.</p><Link href="/property/properties" className="mt-3 inline-block rounded-lg bg-[#0BBDB2] px-4 py-3 text-sm font-semibold">Add a property</Link></section>}
    </>}
    {isPropertySection(section) && showForm && <section id="property-form" className="scroll-mt-4 rounded-xl border bg-white p-4 sm:p-6"><h2 className="text-lg font-semibold">{editing ? "Edit saved record" : "New record"}</h2>
      {section === "units" && <p className="mt-2 text-sm text-slate-600">Occupancy is set by active tenancies. End a tenancy before changing an occupied unit&apos;s availability.</p>}
      {section === "maintenance" && <p className="mt-2 text-sm text-slate-600">A work cost does not create an expense payment. Record any paid expense separately.</p>}
      {section === "tenancies" && <p className="mt-2 text-sm text-slate-600">Creating an active tenancy occupies the unit. Ending it requires an end date and releases the unit.</p>}
      <form onSubmit={save} className="mt-4 space-y-4"><div className="grid gap-4 sm:grid-cols-2">{fields[section].map(field => {
        const inheritedCurrency = field.key === "currency" && section !== "properties";
        const occupied = section === "units" && field.key === "status" && editing?.status === "occupied";
        const disabled = saving || conflict || uncertain || (field.fixed && !!editing) || inheritedCurrency || occupied;
        const control = field.lookup || field.options ? <select id={`property-${field.key}`} value={values[field.key] ?? ""} onChange={event => change(field, event.target.value)} required={!field.optional} disabled={disabled} className={inputClass}>
          {field.lookup && <option value="">{field.optional ? "Entire property / none" : "Select a record"}</option>}
          {field.lookup ? options(field).map(row => <option key={row.id} value={row.id}>{rowName(field.lookup!, row)}{field.lookup === "units" ? ` · ${reference({key: "property_id", label: "", lookup: "properties"}, row.property_id)} · ${readable(row.status)}` : ""}</option>) : <>{occupied && <option value="occupied">Occupied (active tenancy)</option>}{field.options!.map(option => <option key={option} value={option}>{readable(option)}</option>)}</>}
        </select> : field.type === "textarea" ? <textarea id={`property-${field.key}`} value={values[field.key] ?? ""} onChange={event => change(field, event.target.value)} required={!field.optional} maxLength={field.max ?? 3000} disabled={disabled} rows={3} className={inputClass} /> : <input id={`property-${field.key}`} type={field.type ?? "text"} value={values[field.key] ?? ""} onChange={event => change(field, event.target.value)} required={!field.optional} maxLength={field.max ?? 3000} min={field.type === "number" ? field.key === "cost" || field.key === "rent_amount" ? 0 : 0.01 : undefined} step={field.type === "number" ? "0.01" : undefined} inputMode={field.type === "number" ? "decimal" : undefined} disabled={disabled} className={inputClass} />;
        return <div key={field.key} className={`text-sm font-medium ${field.type === "textarea" ? "sm:col-span-2" : ""}`}><label htmlFor={`property-${field.key}`}>{field.label}</label>{control}{inheritedCurrency && <span className="mt-1 block text-xs font-normal text-slate-500">Inherited from the selected property or tenancy.</span>}</div>;
      })}</div>
      {editing && <label className="block text-sm font-medium">Reason for correction<textarea value={reason} onChange={event => setReason(event.target.value)} required maxLength={2000} rows={2} disabled={saving || conflict || uncertain} className={inputClass} /></label>}
      {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
      {conflict && editing && <button type="button" disabled={loading || !data[section].some(row => row.id === editing.id)} className="min-h-11 rounded-lg border px-4 text-sm disabled:opacity-50" onClick={() => {const latest = data[section].find(row => row.id === editing.id);if (latest) start(latest);}}>Load latest saved version</button>}
      <div className="flex flex-wrap gap-3"><button disabled={saving || conflict} className="min-h-11 rounded-lg bg-[#0BBDB2] px-5 text-sm font-semibold disabled:opacity-50">{saving ? "Saving…" : editing ? "Save correction" : "Save record"}</button><button type="button" disabled={saving || uncertain} onClick={() => {setShowForm(false);setSaveError("");retry.current = null;}} className="min-h-11 rounded-lg border px-4 text-sm">Cancel</button></div>
      </form>
    </section>}
    {isPropertySection(section) && !loading && !loadError && <section className="space-y-4">
      <div className="flex flex-wrap gap-3"><label className="grow text-sm">Search records<input value={search} onChange={event => setSearch(event.target.value)} className={inputClass} type="search" /></label>{["units", "tenancies", "maintenance", "properties"].includes(section) && <label className="text-sm">Filter<select value={filter} onChange={event => setFilter(event.target.value)} className={inputClass}><option value="all">All records</option>{(section === "units" ? ["vacant", "occupied", "unavailable"] : section === "tenancies" ? ["active", "ended"] : section === "properties" ? ["active", "inactive"] : ["open", "in_progress", "resolved", "repair", "maintenance"]).map(value => <option key={value} value={value}>{readable(value)}</option>)}</select></label>}</div>
      {!rows.length ? <p className="rounded-xl border border-dashed bg-white p-6 text-sm text-slate-600">{data[section].length ? "No records match this search or filter." : "No records yet. Add your first record when the real details are available."}</p> : <div className="grid gap-4 lg:grid-cols-2">{rows.map(row => <article key={row.id} className="min-w-0 rounded-xl border bg-white p-5"><div className="flex items-start justify-between gap-3"><h2 className="break-words font-semibold">{rowName(section, row)}</h2><button disabled={saving} onClick={() => start(row)} className="min-h-11 shrink-0 rounded-lg border px-3 text-sm" aria-label={`Edit ${rowName(section, row)}`}>Edit</button></div><dl className="mt-3 space-y-2 text-sm">{fields[section].filter(field => row[field.key] !== null && row[field.key] !== "" && row[field.key] !== undefined).map(field => <div key={field.key} className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><dt className="text-slate-500">{field.label}</dt><dd className="break-words">{field.type === "number" ? propertyMoney(Number(row[field.key]), String(row.currency)) : reference(field, row[field.key])}</dd></div>)}</dl><p className="mt-4 break-words text-xs text-slate-500">Revision {row.revision} · Updated {new Date(row.updated_at).toLocaleString()}</p></article>)}</div>}
    </section>}
    {section === "history" && !loading && !loadError && <section className="space-y-4">{history.length ? history.map(event => <article key={event.id} className="min-w-0 rounded-xl border bg-white p-5"><h2 className="font-semibold capitalize">{readable(event.record_type)} · {readable(event.operation)}</h2><p className="mt-2 break-words text-sm text-slate-600">{event.happened_at} · Actor: {event.actor?.name || event.actor_id}</p><p className="mt-2 break-words text-sm">Reason: {event.reason || "No reason recorded."}</p><details className="mt-3 text-sm"><summary className="cursor-pointer py-2 text-teal-800">View original and saved values</summary><p className="break-all text-xs text-slate-500">Record {event.record_id}</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{[["Before", event.before_value], ["After", event.after_value]].map(([label, value]) => <div key={String(label)}><h3 className="font-medium">{String(label)}</h3><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(value, null, 2)}</pre></div>)}</div></details></article>) : <p className="rounded-xl border border-dashed bg-white p-6 text-sm text-slate-600">No property activity recorded yet.</p>}<div className="flex items-center gap-3"><button disabled={historyPage === 0} onClick={() => setHistoryPage(page => page - 1)} className="min-h-11 rounded-lg border px-4 text-sm disabled:opacity-50">Previous</button><span className="text-sm">Page {historyPage + 1}</span><button disabled={!historyMore} onClick={() => setHistoryPage(page => page + 1)} className="min-h-11 rounded-lg border px-4 text-sm disabled:opacity-50">Next</button></div></section>}
  </div>;
}
