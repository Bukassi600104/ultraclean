import type {ManagerScope} from './manager-period-types';
import {queueIdentityKey,type QueueIdentity} from './offline-storage';
import {reportArea,type ReportArea} from './farm-report-areas';

export const FARM_WORKSPACE_POINTER='primefield-prepared-workspace-v1';
export type PreparedFarmWorkspace={version:1;identity:QueueIdentity;preparedAt:string};
export function preparedWorkspace(scope:ManagerScope,sessionActor:string):PreparedFarmWorkspace|null{
 if(scope.business!=='farm'||scope.actorId!==sessionActor||scope.status!=='active'||!scope.featureEnabled||scope.mode==='admin_all'||(scope.mode==='personal'&&(!scope.periodId||scope.managerId!==sessionActor)))return null;
 return {version:1,identity:{actorId:sessionActor,business:'farm',periodId:scope.mode==='legacy'?'legacy':scope.periodId!},preparedAt:new Date().toISOString()};
}
export function matchingWorkspace(value:unknown,sessionActor:string|null):PreparedFarmWorkspace|null{
 const row=value as PreparedFarmWorkspace|null;
 if(!sessionActor||row?.version!==1||row.identity?.business!=='farm'||row.identity.actorId!==sessionActor||!row.identity.periodId||typeof row.preparedAt!=='string')return null;
 return row;
}
export function farmReportDraftKey(identity:QueueIdentity){return `primefield-report-draft:${identity.actorId}:period:${identity.periodId}`;}
export function localReportChoice(base:string,key:string):{key:string;area?:ReportArea;date?:string}|null{
 if(key===base)return {key};
 if(!key.startsWith(base+':area:'))return null;
 const [location,date,...extra]=key.slice(base.length+6).split(':');
 const area=reportArea(location);
 return area&&/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&!extra.length?{key,area,date}:null;
}
export function sameWorkspace(a:QueueIdentity,b:QueueIdentity){return queueIdentityKey(a)===queueIdentityKey(b);}
