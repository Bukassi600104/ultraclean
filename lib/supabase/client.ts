import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase environment variables not set. Database features will be unavailable."
    );
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {global:{fetch:(input,init)=>{
    const url=input instanceof Request?input.url:String(input);
    const authRequest=url.includes('/auth/v1/');
    return fetch(input,authRequest?{...init,signal:AbortSignal.any([AbortSignal.timeout(15000),...(init?.signal?[init.signal]:[])])}:init);
  }}});
}
