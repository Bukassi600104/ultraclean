import {NextResponse} from "next/server";
import {z} from "zod";
import {businessSchema} from "@/lib/operations-cash-validation";
import {cashError,resolvePendingExpense} from "@/lib/operations-cash";
import {requestManagerScope} from "@/lib/manager-read-api";
import {withManagerWrite} from "@/lib/manager-write-api";
const schema=z.object({action:z.enum(["post","decline"]),business:businessSchema,payer_account_id:z.string().uuid().optional(),reason:z.string().trim().min(1).max(1000),expected_revision:z.number().int().nonnegative(),request_id:z.string().uuid()}).strict();
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:{id:string}}){
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success||!z.string().uuid().safeParse(params.id).success)return NextResponse.json({error:"Check the pending record, decision and reason"},{status:400});
 return withManagerWrite(request,parsed.data.business,async()=>{try{const scope=await requestManagerScope(request,parsed.data.business,true),{request_id,...decision}=parsed.data;const result=await resolvePendingExpense({id:scope.actorId},params.id,decision,request_id);return NextResponse.json(result,{status:result.status==="posted"?200:202,headers:{"Cache-Control":"private, no-store"}});}catch(e){return cashError(e);}},true);
}
