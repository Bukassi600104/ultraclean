import {NextResponse} from "next/server";
import {requireAdmin,requireManager,requirePropertyManager,requireContentManager} from "@/lib/auth";
import {resolveManagerScope,readManagerRecords,type Business,type ManagerScope,type RecordFilters} from "@/lib/manager-periods";
import {createServerClient} from "@/lib/supabase/server";
import {farmReadDates} from "@/lib/farm-read-filters";

export async function requestManagerScope(request:Request,business:Business,adminOnly=false) {
 let actor;
 try{actor=await (adminOnly?requireAdmin():business==="farm"?requireManager():business==="property"?requirePropertyManager():requireContentManager());}catch{throw Object.assign(Error("Access required"),{code:business==="farm"&&!adminOnly?"401":"42501"});}
 const params=new URL(request.url).searchParams;
 return resolveManagerScope(actor,business,{managerId:params.get("manager_id")||undefined,periodId:params.get("period_id")||undefined});
}
export function managerReadError(error:unknown) {
 const e=error as {code?:string;message?:string};
 const forbidden=e.code==="42501"||e.code==="401"||e.message?.startsWith("Unauthorized");
 const invalid=["22023","22P02","22007","22008"].includes(e.code||"");
 return NextResponse.json({error:forbidden?e.message||"Manager access required":invalid?"Check the selected dates and filters":"Records are unavailable. Please retry."},{status:e.code==="401"?401:forbidden?403:invalid?400:503});
}
export async function allManagerRecords(scope:ManagerScope,resource:string,filters:RecordFilters={}) {
 const rows:Record<string,unknown>[]=[];
 for(let page=0;;page++){const result=await readManagerRecords(scope,resource,{...filters,page,limit:500});rows.push(...result.data);if(!result.has_more)return rows;}
}
type Shape="list"|"array"|"day"|"livestock"|"expenses";
export async function managerReadResponse(request:Request,business:Business,resource:string,shape:Shape="list",adminOnly=false):Promise<NextResponse|null> {
 try{
  const scope=await requestManagerScope(request,business,adminOnly);
  const params=new URL(request.url).searchParams;
  if(scope.mode==="admin_all"||(scope.mode==="legacy"&&!scope.periodId))return null;
  const defaults:Record<string,number>={farm_correction_requests:30,farm_activity:30,farm_inventory_transactions:200,farm_feed_stock:100,farm_feed_stock_movements:100};
  const zeroBased=business!=="farm",rawPage=Number(params.get("page")||(zeroBased?0:1)),limit=Number(params.get("limit")||(business==="farm"?(defaults[resource]||50):100));
  if(!Number.isSafeInteger(rawPage)||rawPage<(zeroBased?0:1)||!Number.isInteger(limit)||limit<1||limit>500)throw Object.assign(Error("Invalid page"),{code:"22023"});
  const page=zeroBased?rawPage:rawPage-1,filters:RecordFilters={page,limit};
  let dates;try{dates=farmReadDates(params);}catch{throw Object.assign(Error("Invalid date"),{code:"22023"});}
  if(dates.date){filters.from=dates.date;filters.to=dates.date;}else{filters.from=dates.from||undefined;filters.to=dates.to||undefined;}
  for(const key of ["product","category","action","item_id","stock_id","status","feed_type","feed_source","id"]){
   const value=params.get(key);if(!value||value==="all")continue;
   if((key==="id"||key.endsWith("_id"))&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw Object.assign(Error("Invalid record ID"),{code:"22023"});
   filters[key]=value;
  }
  if(["farm_sales","farm_expenses","farm_fund_transfers"].includes(resource))filters.active=true;
  if(resource==="farm_supply_inventory"&&params.get("include_archived")!=="true")filters.active=true;
  if(shape==="day"){
   if(scope.mode==="legacy"){
    const date=params.get("date")||new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    const result=await readManagerRecords(scope,"farm_daily_records",{date,limit:1});return NextResponse.json({record:result.data[0]||null});
   }
   const db=createServerClient();if(!db)throw Error();
   const {data,error}=await db.rpc("manager_day_read",{p_actor:scope.actorId,p_period_id:scope.periodId,p_date:params.get("date")||new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())});
   if(error)throw error;return NextResponse.json({record:data},{headers:{"Cache-Control":"private, no-store"}});
  }
  let result=shape==="array"||shape==="livestock"||params.get("all")==="1"?{data:await allManagerRecords(scope,resource,filters),total:0,has_more:false}:await readManagerRecords(scope,resource,filters);
  if(shape==="array"||params.get("all")==="1")result.total=result.data.length;
  if(shape==="livestock"){
   const db=createServerClient();if(!db)throw Error();const {data,error}=await db.rpc("farm_livestock_balances");if(error)throw error;
   const visible=new Set(result.data.map(row=>row.id));
   const inventory=await allManagerRecords(scope,"farm_inventory"),products=new Set(inventory.map(row=>row.product));
   result={...result,data:(data||[]).filter((row:{id:string|null;product:string})=>row.id?visible.has(row.id):products.has(row.product))};
  }
  if(shape==="expenses"){
   const expenses=await allManagerRecords(scope,"farm_expenses",{...filters,active:true}),feed=await allManagerRecords(scope,"farm_feed_purchases",{from:filters.from,to:filters.to});
   const category=params.get("category")||"all";
   const purchases=(await allManagerRecords(scope,"farm_purchase_payments",{from:filters.from,to:filters.to,active:true})).filter(r=>!r.voided_at&&(category==="all"||r.category===category));
   const rows=[...purchases.map(data=>({_type:"purchase",data})),...(category==="feed"?[]:expenses.map(data=>({_type:"expense",data}))),...(!["all","feed"].includes(category)?[]:feed.map(data=>({_type:"feed",data})))].sort((a,b)=>String(b.data.date).localeCompare(String(a.data.date))||String(b.data.id).localeCompare(String(a.data.id)));
   return NextResponse.json({data:rows.slice(page*limit,(page+1)*limit),total:rows.length,page:page+1,limit});
  }
  return NextResponse.json(shape==="array"?result.data:{...result,...(zeroBased?{page}:{} )},{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return managerReadError(error);}
}
