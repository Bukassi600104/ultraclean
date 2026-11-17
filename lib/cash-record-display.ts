import type {ReportRow} from "./manager-reports";
import type {CashAccount} from "./operations-cash-validation";
import {subtractMoney, sumMoney} from "./money";

type CashLabel = {details:string; status:string};

export function cashRecordLabels(records:Record<string,ReportRow[]>, accounts:CashAccount[]):Map<unknown,CashLabel> {
 const events=records.operations_cash_events||[];
 const customers=new Map((records.farm_customers||[]).map(row=>[row.id,row.name]));
 const receiptCustomers=new Map((records.farm_customer_receipts||[]).map(row=>[row.id,customers.get(row.customer_id)]));
 const holders=new Map(accounts.map(account=>[account.id,account]));
 const replacements=new Map(events.filter(row=>row.corrects_id).map(row=>[row.corrects_id,row.operation]));
 const received=new Map<unknown,string>();
 // Each dispatch has its own awaiting-receipt account. Use the surviving receipts through the report end date.
 for(const row of events){
  if(row.cash_kind==="receive" && row.operation!=="void" && !replacements.has(row.id)){
   received.set(row.source_account_id,sumMoney([received.get(row.source_account_id)||"0",String(row.amount_exact??row.amount)]));
  }
 }

 const labels=new Map<unknown,CashLabel>();
 for(const row of events){
  const kind=row.cash_kind||row.operation;
  const account=holders.get(String(row.target_account_id));
  const target=String(row.target_name||account?.name||"");
  const recipient=account?.holder_type==="awaiting"?target.replace(/ awaiting receipt$/i,""):target;
  const source=String(row.source_name||"");
  let details="",status="";
  switch(kind){
   case "inflow": {
    const customer=row.resource==="farm_customer_receipts"?receiptCustomers.get(row.record_id):null;
    const payer=customer?"From "+customer:"";
    const receiver=recipient?"Received by "+recipient:"";
    details=[payer,receiver].filter(Boolean).join(" · ")||"Payment";
    status="Payment received";
    break;
   }
   case "fund":
   case "handoff": {
    details=kind==="fund"?"Owner funds":source?"Handover from "+source:"Handover";
    if(recipient)details+=" to "+recipient;
    status="Transfer recorded";
    if(account?.holder_type==="awaiting"){
     const confirmed=received.get(row.target_account_id);
     status="Awaiting receipt";
     if(confirmed && row.operation!=="void"){
      const left=subtractMoney(String(row.amount_exact??row.amount),confirmed);
      status=/^0(?:\.0+)?$/.test(left)?"Receipt confirmed":"Partly received";
     }
    }
    break;
   }
   case "receive":
    details=recipient?"Received by "+recipient:"Money received";
    status="Receipt confirmed";
    break;
   case "spend":
    details=source?"Paid by "+source:"Expense payment";
    status=row.resource==="farm_customer_refunds"?"Refund recorded":"Expense paid";
    break;
   case "legacy_assignment":
    details=recipient?"Earlier funds assigned to "+recipient:"Earlier funds assigned";
    status="Assignment recorded";
    break;
   default:
    details=String(row.notes||"Cash entry");
    status="Recorded";
  }
  const replacement=replacements.get(row.id);
  if(replacement)status=replacement==="void"?"Cancelled":"Corrected";
  else if(row.operation==="void")status="Cancellation recorded";
  else if(row.operation==="correct")status="Correction recorded";
  labels.set(row.id,{details,status});
 }
 return labels;
}
