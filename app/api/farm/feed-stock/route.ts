import {withManagerWrite} from "@/lib/manager-write-api";
import {requestManagerScope,managerReadError} from "@/lib/manager-read-api";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {requireManager} from "@/lib/auth";
import {createServerClient} from "@/lib/supabase/server";
import {feedStockWrite} from "@/lib/farm-feed-stock";
import {farmErrorResponse} from "@/lib/farm-v2";
export const runtime="nodejs";
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+"T12:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;},"Invalid date");
const source={feed_type:z.enum(["fish","goat","chicken","pig","turkey","cattle","other"]),feed_source:z.enum(["local","foreign"]).default("local")};
const physical=z.object({operation:z.enum(["starting","received","opened","problem"]),payload:z.object({...source,date,bags:z.number().int().min(0).max(99999999),notes:z.string().trim().max(2000).optional(),request_review:z.boolean().optional(),included_in_starting_count:z.boolean().optional(),receipt_inclusions:z.array(z.object({movement_id:z.string().uuid(),included:z.boolean()}).strict()).max(500).optional()}).strict(),request_id:z.string().uuid().optional()}).strict();
const schema=z.union([physical,
 z.object({operation:z.literal("review_problem"),id:z.string().uuid(),payload:z.object({decision:z.enum(["approve","decline"]),expected_revision:z.number().int().nonnegative().optional()}).strict(),reason:z.string().trim().min(1).max(2000),request_id:z.string().uuid().optional()}).strict(),
 z.object({operation:z.literal("opening"),payload:z.object({...source,date,bags_available:z.number().int().min(0).max(99999999)}).strict(),reason:z.string().trim().min(1).max(2000),request_id:z.string().uuid().optional()}).strict(),
 z.object({operation:z.literal("adjust"),id:z.string().uuid(),payload:z.object({date,bags_delta:z.number().int().min(-99999999).max(99999999).refine(v=>v!==0),expected_revision:z.number().int().nonnegative()}).strict(),reason:z.string().trim().min(1).max(2000),request_id:z.string().uuid().optional()}).strict(),
 z.object({operation:z.literal("use"),payload:z.object({daily_feed_id:z.string().uuid(),bags_opened:z.number().int().min(1).max(99999999)}).strict(),reason:z.string().trim().max(2000).optional(),request_id:z.string().uuid().optional()}).strict(),
]);
export async function GET(request:NextRequest){
 try{
  const scope=await requestManagerScope(request,"farm"),params=new URL(request.url).searchParams;
  const query=z.object({stock_id:z.string().uuid().nullable(),date:date.nullable(),page:z.coerce.number().int().min(1),limit:z.coerce.number().int().min(1).max(500)}).safeParse({stock_id:params.get("stock_id"),date:params.get("date"),page:params.get("page")??1,limit:params.get("limit")??100});
  if(!query.success)return NextResponse.json({error:"Check the feed history date and filters"},{status:400});
  const db=createServerClient();if(!db)return farmErrorResponse({code:"503",message:"Database not configured"});
  const {data,error}=await db.rpc("farm_feed_inventory_read",{p_actor:scope.actorId,p_period_id:scope.mode==="legacy"&&!params.has("period_id")?null:scope.periodId,p_history:params.get("history")==="1",p_stock_id:query.data.stock_id,p_date:query.data.date,p_page:query.data.page-1,p_limit:query.data.limit});
  if(error)return farmErrorResponse(error);return NextResponse.json(data,{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return managerReadError(error);}
}
export async function POST(request:NextRequest){return withManagerWrite(request,"farm",async()=>{
 let profile;try{profile=await requireManager();}catch{return NextResponse.json({error:"Unauthorized"},{status:401});}
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Validation failed",details:parsed.error.flatten().fieldErrors},{status:400});
 const body=parsed.data;
 if(["opening","adjust","review_problem"].includes(body.operation)&&profile.role!=="admin")return NextResponse.json({error:"CEO authorization required"},{status:403});
 const requestId=request.headers.get("X-Request-ID")||body.request_id;if(!requestId||!z.string().uuid().safeParse(requestId).success)return NextResponse.json({error:"Valid retry identifier required"},{status:400});
 const {data,error}=await feedStockWrite(profile,body.operation,body.payload,{id:"id" in body?body.id:undefined,reason:"reason" in body?body.reason:undefined,requestId});
 if(error)return farmErrorResponse(error);return NextResponse.json({data},{status:201});
});}
