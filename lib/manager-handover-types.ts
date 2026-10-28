import type {LivestockGroup} from "./farm-livestock-categories";
export type HandoverItem={itemId:string;resource:string;recordId:string|null;label:string;quantity:string|null;unit:string;version:string;status:"pending"|"confirmed"|"cannot_confirm";details:(Omit<LivestockGroup,"quantity">&{quantity:string})[]};
export type HandoverState={sessionId:string|null;periodId:string;status:"awaiting_handover"|"active";snapshotVersion:string;asOf:string;acceptedAt:string|null;steps:{id:string;title:string;items:HandoverItem[]}[];issues:{itemId:string;label:string;status:string;countNeeded:boolean}[];conflict?:string};
export type HandoverDecision={sessionId:string;operation:"save"|"finalize";items:{itemId:string;status:"confirmed"|"cannot_confirm";version:string}[];requestId:string};
