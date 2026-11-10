export function queueUpdateProblem(storage:Pick<Storage,'length'|'key'|'getItem'>,supportedVersion:number):string|null{
 try{
  for(let i=0;i<storage.length;i++){
   const confirmedKey=storage.key(i);if(confirmedKey?.startsWith('farm_confirmed_')){const value=JSON.parse(storage.getItem(confirmedKey)||'null');if(!value||value.schemaVersion!==1||!value.identity?.actorId||!value.identity?.periodId||typeof value.requestId!=='string'||typeof value.endpoint!=='string'||!Number.isFinite(Date.parse(value.confirmedAt)))return 'A saved confirmation needs review. Keep this tab open and contact support.';continue;}
   const key=storage.key(i);if(!key||!(/^(farm_pending_|farm-(batch|health|purchase|store|credit)-draft|primefield-(feed-record|daily-feed-retry|feed-count-review|operation-retry|handover-retry|report-draft|request-draft|batch-draft|health-draft|purchase-draft|store-draft)|bossbimbz-(property|content)-pending|manager-funds-receipt|ceo-(period|cash|funding-review))/.test(key)))continue;
   const item=JSON.parse(storage.getItem(key)||'null');
   if(item===null&&!key.startsWith('farm_pending_'))continue;
   if(!item||typeof item!=='object'||(item.schemaVersion??1)>supportedVersion||key.startsWith('farm_pending_')&&(!item.data||typeof item.data!=='object'||Array.isArray(item.data)||typeof item.endpoint!=='string'))return 'A saved submission needs a compatible app version. Keep this tab open and contact support.';
  }
  return null;
 }catch{return 'Device storage could not be checked safely. Keep this tab open and restore storage access before updating.';}
}
