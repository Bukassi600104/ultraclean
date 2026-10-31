export function queueUpdateProblem(storage:Pick<Storage,'length'|'key'|'getItem'>,supportedVersion:number):string|null{
 try{
  for(let i=0;i<storage.length;i++){
   const key=storage.key(i);if(!key?.startsWith('farm_pending_'))continue;
   const item=JSON.parse(storage.getItem(key)||'null');
   if(!item||typeof item!=='object'||!item.data||typeof item.endpoint!=='string'||(item.schemaVersion??1)>supportedVersion)return 'A saved submission needs a compatible app version. Keep this tab open and contact support.';
  }
  return null;
 }catch{return 'Device storage could not be checked safely. Keep this tab open and restore storage access before updating.';}
}
