import type {Business, ManagerScope} from "./manager-period-types";
import {createServerClient} from "@/lib/supabase/server";

type StatementAccount = {id:string;name:string;bucket:"owner"|"sales";currency:string};
export type StatementBalance = StatementAccount & {opening:string;money_in:string;money_out:string;closing:string};
export type StatementMovement = {
  id:string;account_id:string;holder:string;date:string;bucket:StatementAccount["bucket"];currency:string;
  operation:string;kind:string;resource:string|null;phase:"effect"|"reversal";
  sender:string;recipient:string;amount:string;balance:string;
};
export type StatementDispatch = {
  id:string;date:string;bucket:StatementAccount["bucket"];currency:string;sender:string;recipient:string;
  sent:string;received:string;outstanding:string;status:"cancelled"|"received"|"partial"|"awaiting";
};
export type CashStatementData = {
  from:string;to:string;page:number;limit:number;accounts:StatementAccount[];balances:StatementBalance[];
  movements:StatementMovement[];dispatches:StatementDispatch[];total:number;dispatch_total:number;
};
export type CashStatementFilters = {business:Business;from?:string;to?:string;page:number;limit:number;accountId?:string};

export async function getCashStatement(scope:ManagerScope,filters:CashStatementFilters):Promise<CashStatementData>{
  const db=createServerClient();
  if(!db)throw Error("Funds are unavailable. Please try again.");
  const {data,error}=await db.rpc("operations_cash_statement",{
    p_actor:scope.actorId,p_business:scope.business,p_period_id:scope.periodId,
    p_from:filters.from??null,p_to:filters.to??null,p_page:filters.page,p_limit:filters.limit,
    p_account_id:filters.accountId??null,
  });
  if(error)throw error;
  return data;
}
