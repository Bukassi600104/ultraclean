import {useId, useMemo} from 'react';
import Link from 'next/link';
import {farmCustomerBalances, type CreditData} from '@/lib/farm-credit';
import {farmDateToday} from '@/lib/farm-products';
import {formatExactCurrency} from '@/lib/money';

const statusStyles = {
  Overdue: 'bg-red-100 text-red-900',
  'On credit': 'bg-amber-100 text-amber-950',
  Clear: 'bg-emerald-100 text-emerald-950',
};
const balanceDate = new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'short', year:'numeric', timeZone:'UTC'});
const money = (value: string) => formatExactCurrency(value, 'NGN');

export function FarmCustomerBalances({invoices, paymentsHref}: {
  invoices: CreditData['invoices'];
  paymentsHref?: string;
}) {
  const title = useId();
  const balances = useMemo(() => farmCustomerBalances(invoices), [invoices]);
  const today = Date.parse(farmDateToday());

  return (
    <section aria-labelledby={title} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <h2 id={title} className="text-xl font-bold text-slate-950">Who owes the farm</h2>
        {paymentsHref&&<Link href={paymentsHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-900 underline">Customers &amp; payments</Link>}
      </div>
      <p className="mt-1 text-sm text-slate-600">Current balances and payments applied to invoices and earlier balances.</p>
      <p className="mt-2 text-xs text-slate-600 sm:hidden">Scroll the table to see all columns.</p>
      <div role="region" aria-label="Customer balances" tabIndex={0} className="mt-3 overflow-x-auto rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800">
        <table aria-labelledby={title} className="w-full min-w-[38rem] text-left text-sm [&_th]:px-2 [&_td]:px-2 sm:[&_th]:px-3 sm:[&_td]:px-3">
          <thead className="border-y border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-[8rem] bg-slate-50 py-3">Customer</th>
              <th scope="col" className="py-3 text-right">Billed</th>
              <th scope="col" className="py-3 text-right">Paid</th>
              <th scope="col" className="py-3 text-right">Balance</th>
              <th scope="col" className="py-3">Oldest unpaid</th>
              <th scope="col" className="py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {balances.length === 0&&<tr><td colSpan={6} className="py-5 text-slate-600">No customer invoices or earlier balances recorded here yet.</td></tr>}
            {balances.map(account => {
              const oldest = account.oldestUnpaid;
              const days = oldest ? Math.round((today - Date.parse(oldest)) / 86400000) : 0;
              return (
                <tr className="align-top" key={account.customerId}>
                  <th scope="row" className="sticky left-0 z-10 max-w-[11rem] break-words border-r border-slate-200 bg-white py-3 font-semibold sm:border-0">
                    {account.customerName}
                    <span className="mt-1 block text-xs font-normal tabular-nums text-slate-700 sm:hidden">{money(account.balance)} balance</span>
                  </th>
                  <td className="whitespace-nowrap py-3 text-right tabular-nums">{money(account.billed)}</td>
                  <td className="whitespace-nowrap py-3 text-right tabular-nums">{account.paid===null ? 'Unavailable' : money(account.paid)}</td>
                  <td className="whitespace-nowrap py-3 text-right font-semibold tabular-nums">{money(account.balance)}</td>
                  <td className="whitespace-nowrap py-3">
                    {oldest ? <>
                      <p>{days <= 0 ? 'Today' : days === 1 ? '1 day' : days+' days'}</p>
                      <time dateTime={oldest} className="text-xs text-slate-600">{balanceDate.format(new Date(oldest))}</time>
                    </> : 'None'}
                  </td>
                  <td className="whitespace-nowrap py-3"><span className={'inline-block rounded-full px-2 py-1 text-xs font-semibold '+statusStyles[account.status]}>{account.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
