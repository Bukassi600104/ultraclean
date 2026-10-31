import type {SupabaseClient, User} from '@supabase/supabase-js';
import type {UserRole} from './auth';

export type AuthProfile={id:string;role:UserRole;suspended?:boolean;name:string|null;email:string|null};
export type AuthIdentity={user:User|null;profile:AuthProfile|null;error:string|null};

export async function loadAuthIdentity(client:SupabaseClient,timeoutMs=15000):Promise<AuthIdentity>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 const failure=(error:string):AuthIdentity=>({user:null,profile:null,error});
 const read=async():Promise<AuthIdentity>=>{
  try{
   const {data,error}=await client.auth.getUser();
   if(error)return failure('AUTH_UNAVAILABLE');
   if(!data.user)return {user:null,profile:null,error:null};
   const result=await client.from('profiles').select('id,role,suspended,name,email').eq('id',data.user.id).single();
   if(result.error||!result.data)return failure('PROFILE_UNAVAILABLE');
   return {user:data.user,profile:result.data as AuthProfile,error:null};
  }catch{return failure('AUTH_UNAVAILABLE');}
 };
 try{return await Promise.race([read(),new Promise<AuthIdentity>(resolve=>{timer=setTimeout(()=>resolve(failure('AUTH_TIMEOUT')),timeoutMs);})]);}
 finally{clearTimeout(timer);}
}
