import {invoiceStatus} from "@/lib/farm-credit";
import {formatExactCurrency} from "@/lib/money";
import type {FarmSale} from "@/types";

export function SalePaymentDetails({sale}:{sale:Pick<FarmSale,"invoice"|"invoice_id"|"payment_method">}){
 const invoice=sale.invoice;
 if(!invoice)return <span className="text-sm text-slate-600">{sale.invoice_id?"Invoice details unavailable":"Historical sale · "+(sale.payment_method||"Payment method not recorded")}</span>;
 return <div className="space-y-1 text-sm">
  <strong className="text-emerald-950">{invoiceStatus(invoice)}</strong>
  <p>{invoice.number}</p>
  <p>Paid {invoice.collected==null?"unavailable":formatExactCurrency(invoice.collected,"NGN")} · Owed {formatExactCurrency(invoice.owed,"NGN")}</p>
 </div>;
}
