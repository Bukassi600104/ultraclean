import {postCash} from "@/lib/operations-cash";
export const runtime="nodejs";
export function POST(request:Request){return postCash(request,true);}
