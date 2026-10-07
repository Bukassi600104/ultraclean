import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {requireManager} from "@/lib/auth";
import {createServerClient} from "@/lib/supabase/server";
import {feedStockWrite} from "@/lib/farm-feed-stock";
import {farmErrorResponse} from "@/lib/farm-v2";
export const runtime="nodejs";
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+"T12:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;},"Invalid date");
const source={feed_type:z.enum(["fish","goat","chicken","pig","turkey","cattle","other"]),feed_source:z.enum(["local","foreign"]).default("local")};
const schema=z.discriminatedUnion("operation",[
 z.object({operation:z.literal("opening"),payload:z.object({...source,date,bags_available:z.number().int().min(0).max(99999999)}).strict(),reason:z.string().trim().min(1).max(2000),request_id:z.string().uuid().optional()}).strict(),
 z.object({operation:z.literal("adjust"),id:z.string().uuid(),payload:z.object({date,bags_delta:z.number().int().min(-99999999).max(99999999).refine(v=>v!==0),expected_revision:z.number().int().nonnegative()}).strict(),reason:z.string().trim().min(1).max(2000),request_id:z.string().uuid().optional()}).strict(),
 z.object({operation:z.literal("use"),payload:z.object({daily_feed_id:z.string().uuid(),bags_opened:z.number().int().min(1).max(99999999)}).strict(),reason:z.string().trim().max(2000).optional(),request_id:z.string().uuid().optional()}).strict(),
]);
export async function GET(request:NextRequest){
 let profile;try{profile=await requireManager();}catch{return NextResponse.json({error:"Unauthorized"},{status:401});}void profile;
 const db=createServerClient();if(!db)return farmErrorResponse({code:"503",message:"Database not configured"});
 const params=new URL(request.url).searchParams;const history=params.get("history")==="1";
 const movementDate=params.get("date");if(movementDate&&!date.safeParse(movementDate).success)return NextResponse.json({error:"Invalid movement date"},{status:400});
 const stockId=params.get("stock_id");if(stockId&&!z.string().uuid().safeParse(stockId).success)return NextResponse.json({error:"Invalid stock ID"},{status:400});
 const page=Math.max(1,Number.parseInt(params.get("page")||"1")||1),limit=100;
 let q=db.from(history?"farm_feed_stock_movements":"farm_feed_stock").select("*",{count:"exact"});
 if(history){if(movementDate)q=q.eq("movement_date",movementDate);if(stockId)q=q.eq("stock_id",stockId);q=q.order("created_at",{ascending:false}).order("id",{ascending:false});}
 else q=q.order("feed_type",{ascending:true}).order("feed_source",{ascending:true});
 const {data,error,count}=await q.range((page-1)*limit,page*limit-1);if(error)return farmErrorResponse(error);
 return NextResponse.json({data,total:count});
}
export async function POST(request:NextRequest){
 let profile;try{profile=await requireManager();}catch{return NextResponse.json({error:"Unauthorized"},{status:401});}
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Validation failed",details:parsed.error.flatten().fieldErrors},{status:400});
 const body=parsed.data;if(body.operation!=="use"&&profile.role!=="admin")return NextResponse.json({error:"CEO authorization required"},{status:403});
 const requestId=request.headers.get("X-Request-ID")||body.request_id;if(!requestId||!z.string().uuid().safeParse(requestId).success)return NextResponse.json({error:"Valid retry identifier required"},{status:400});
 const {data,error}=await feedStockWrite(profile,body.operation,body.payload,{id:body.operation==="adjust"?body.id:undefined,reason:body.reason,requestId});
 if(error)return farmErrorResponse(error);return NextResponse.json({data},{status:201});
}
