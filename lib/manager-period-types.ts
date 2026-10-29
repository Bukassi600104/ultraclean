export type Business = "farm" | "property" | "content";
export type ManagerScope = {
 business: Business; actorId: string; mode: "admin_all" | "legacy" | "personal";
 managerId: string | null; periodId: string | null; startsOn: string | null;
 status: "active" | "awaiting_handover" | "closed";
 featureEnabled: boolean;
};
export type WriteOutcome<T> = {status:"posted";data:T}|{status:"pending_funding";id:string;currency:string;shortfall:string}|{status:"awaiting_receipt";id:string;currency:string;amount:string};
export const businessForRole = (role:string):Business|null => role === "manager" ? "farm" : role === "property_manager" ? "property" : role === "content_manager" ? "content" : null;
