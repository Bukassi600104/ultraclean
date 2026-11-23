import type { ReactNode } from "react";
import Link from "next/link";
import type { getCeoOverview } from "@/lib/ceo-overview";
import { farmProductLabel } from "@/lib/farm-products";
import { businessMoney as money } from "../BusinessFinancialCharts";

type Farm = NonNullable<Awaited<ReturnType<typeof getCeoOverview>>["farm"]["data"]>;
type Funding = Awaited<ReturnType<typeof getCeoOverview>>["funding"];
type Scope = { from: string; to: string };
type LedgerLine = [label: string, amount: number, href?: string];

const integer = new Intl.NumberFormat("en-GB");
const calendar = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });
const box = "min-w-0 space-y-3 rounded-xl border border-slate-200 p-4";
const link = "inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline underline-offset-2";

export function dashboardDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Date not recorded";
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(date.getTime()) ? calendar.format(date) : "Date not recorded";
}

function stockTotal(rows: Farm["inventory"]) {
  if (!rows.length || rows.some(row =>
    (typeof row.current_stock !== "number" && (typeof row.current_stock !== "string" || !row.current_stock.trim()))
    || !Number.isFinite(Number(row.current_stock)))) return "Not recorded";
  return integer.format(rows.reduce((sum, row) => sum + Number(row.current_stock), 0));
}

function Balance({ title, value, detail, className }: { title: string; value: ReactNode; detail?: string; className?: string }) {
  return <div className={className ? "min-w-0 " + className : "min-w-0"}>
    <dt className="text-sm text-slate-600">{title}</dt>
    <dd className="break-words text-2xl font-bold tabular-nums">{value}</dd>
    {detail && <dd className="text-xs text-slate-600">{detail}</dd>}
  </div>;
}

function Ledger({ title, rows }: { title: string; rows: LedgerLine[] }) {
  return <div className="min-w-0">
    <h5 className="mb-2 font-semibold">{title}</h5>
    <dl className="text-sm">
      {rows.map(([label, amount, href], index) => <div key={label}
        className={"flex flex-wrap items-center justify-between gap-x-3 border-b border-slate-100 py-2" + (index === rows.length - 1 ? " font-bold" : "")}>
        <dt>{href ? <Link className={link} href={href}>{label}</Link> : label}</dt>
        <dd className="tabular-nums">{money(amount)}</dd>
      </div>)}
    </dl>
  </div>;
}

export function CeoFarmLedger({ farm, funding, scope }: { farm: Farm; funding?: Funding; scope: Scope }) {
  const range = new URLSearchParams({ from: scope.from, to: scope.to }).toString();
  const dates = scope.from === scope.to ? dashboardDate(scope.to) : dashboardDate(scope.from) + " to " + dashboardDate(scope.to);
  const funds = "/dashboard/funds?business=farm&" + range;
  const recipientStatement = funds + "#recipient-statement";
  const sales = "/dashboard/farm/sales?" + range;
  const expenses = "/dashboard/farm/expenses?" + range;
  const mortality = "/dashboard/farm/inventory?" + range + "&tab=mortality#mortality-log";
  const reconciliation = farm.finance.period_reconciliation;

  const owner: LedgerLine[] = reconciliation ? [
    ["Opening balance", reconciliation.opening_owner_balance],
    ["+ Owner transfers recorded", reconciliation.owner_transfers, recipientStatement],
    ["− Posted general expenses", reconciliation.owner_general_expenses, expenses],
    ["− Posted feed purchases", reconciliation.feed_expenses, expenses],
    ...(reconciliation.owner_rounding_adjustment ? [["Rounding adjustment", reconciliation.owner_rounding_adjustment] as LedgerLine] : []),
    ["Closing balance", reconciliation.closing_owner_balance],
  ] : [];
  const salesCash: LedgerLine[] = reconciliation ? [
    ["Opening balance", reconciliation.opening_sales_cash_balance],
    ["+ Cash collected", reconciliation.sales, "/dashboard/farm/credit?" + range],
    ["− Posted expenses paid from sales cash", reconciliation.sales_funded_expenses, expenses],
    ...(reconciliation.sales_rounding_adjustment ? [["Rounding adjustment", reconciliation.sales_rounding_adjustment] as LedgerLine] : []),
    ["Closing balance", reconciliation.closing_sales_cash_balance],
  ] : [];

  return <div className="space-y-4">
    <section className={box} aria-labelledby="ceo-farm-stock-title">
      <h4 className="font-semibold" id="ceo-farm-stock-title">Current recorded stock</h4>
      <dl className="grid grid-cols-2 gap-4">
        <Balance title="Catfish on hand" value={stockTotal(farm.fish)} />
        <Balance title="Land animals and poultry on hand" value={stockTotal(farm.livestock)}
          detail={farm.livestock.length ? farm.livestock.filter(row => Number(row.current_stock) > 0)
            .map(row => farmProductLabel(String(row.product)) + " " + integer.format(Number(row.current_stock))).join(" · ") : undefined} />
      </dl>
      <div className="flex flex-wrap gap-x-5">
        <Link href="/dashboard/farm/inventory" className={link}>View stock records</Link>
        <Link href="/dashboard/farm/stores?view=animals" className={link}>View physical counts</Link>
      </div>
    </section>
    <section className={box} aria-labelledby="ceo-farm-activity-title">
      <div><h4 className="font-semibold" id="ceo-farm-activity-title">Farm activity</h4><p className="text-sm text-slate-600">{dates}</p></div>
      <dl className="grid grid-cols-2 gap-4">
        <Balance title="Sales entries" value={integer.format(farm.salesCount)} />
        <Balance title="Recorded deaths" value={integer.format(farm.mortality.reduce((sum, row) => sum + Number(row.quantity), 0))}
          detail={farm.mortality.map(row => farmProductLabel(row.product) + " " + integer.format(row.quantity)).join(" · ")} />
      </dl>
      <div className="flex flex-wrap gap-x-5">
        <Link href={sales} className={link}>View sales entries</Link>
        <Link href={mortality} className={link}>View mortality records</Link>
      </div>
    </section>
    <section className={box} aria-labelledby="ceo-farm-ledger-title">
      <div><h4 className="font-semibold" id="ceo-farm-ledger-title">Farm ledger</h4><p className="text-sm text-slate-600">{dates}</p></div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Balance className="rounded-lg bg-teal-50 p-3" title="Owner funds closing balance" value={money(farm.finance.closing_balance)} />
        <Balance className="rounded-lg bg-slate-50 p-3" title="Sales cash closing balance" value={money(farm.finance.sales_cash_balance)} />
      </dl>
      <Link href={recipientStatement} className={link}>See funds by recipient</Link>
      {reconciliation && <details className="border-t border-slate-100 pt-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">How the balances are calculated</summary>
        <div className="grid gap-5 md:grid-cols-2"><Ledger title="Owner funds" rows={owner} /><Ledger title="Sales cash" rows={salesCash} /></div>
        <p className="mt-3 text-sm text-slate-600">Owner transfers are recorded when sent. Recipient statements show what was confirmed and what is still awaiting receipt.</p>
        <p className="mt-1 text-sm text-slate-600">Cash collected includes customer receipts and older cash sales, less refunds.</p>
      </details>}
      {funding?.data && (funding.data.pending.count > 0 || funding.data.emergency.count > 0) && <div className="rounded-lg bg-amber-50 p-3 text-sm">
        <p className="font-semibold text-amber-950">Reported spending awaiting review</p>
        {funding.data.pending.count > 0 && <p>{integer.format(funding.data.pending.count)} {funding.data.pending.count === 1 ? "entry" : "entries"} awaiting funding confirmation · {money(funding.data.pending.amount)}</p>}
        {funding.data.emergency.count > 0 && <p>{integer.format(funding.data.emergency.count)} {funding.data.emergency.count === 1 ? "emergency report" : "emergency reports"} awaiting review · {money(funding.data.emergency.amount)}</p>}
        <p className="text-slate-600">These amounts are included in posted spending once approved and recorded.</p>
        <div className="flex flex-wrap gap-x-4">
          {funding.data.pending.count > 0 && <Link href={funds + "#funding-reviews"} className={link}>Review funding</Link>}
          {funding.data.emergency.count > 0 && <Link href="/dashboard/farm/purchases#emergency-expenses" className={link}>Review emergency expenses</Link>}
        </div>
      </div>}
      {funding?.error && <p role="status" className="text-sm text-amber-900">Spending awaiting review could not be loaded. <Link className={link} href={funds}>Open farm funds</Link></p>}
      <dl className="grid gap-3 border-t pt-3 sm:grid-cols-3">
        <Balance title="Recorded revenue" value={money(farm.finance.revenue)} />
        <Balance title="Posted expenses" value={money(farm.finance.total_expenses)} />
        <Balance title="Recorded operating result" value={money(farm.finance.operational_net)} />
      </dl>
    </section>
  </div>;
}
