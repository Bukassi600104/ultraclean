/* Only public shell and build assets are cached. Never cache API or authenticated pages. */
const FARM_CACHE='primefield-offline-public-v1';
const FARM_SHELL='/offline/farm';
const publicAsset=url=>url.origin===self.location.origin&&url.pathname.startsWith('/_next/static/');
async function prepareShell(){
 const response=await fetch(FARM_SHELL,{credentials:'omit',cache:'reload'});
 if(!response.ok||response.redirected||!response.headers.get('content-type')?.includes('text/html'))throw Error('Offline shell unavailable');
 const html=await response.clone().text(),cache=await caches.open(FARM_CACHE);
 if(!html.includes('data-farm-offline-shell'))throw Error('Unexpected offline page');
 const assets=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match=>new URL(match[1],self.location.origin)).filter(publicAsset);
 await Promise.all(assets.map(async url=>{const result=await fetch(url,{credentials:'omit'});if(!result.ok)throw Error('Offline asset unavailable');await cache.put(url,result);}));
 await cache.put(FARM_SHELL,response);
 // Activation is deliberately not forced while users may be submitting work.
}
self.addEventListener('install',event=>event.waitUntil(prepareShell()));
self.addEventListener('message',event=>{if(event.data?.type==='PREPARE_FARM_OFFLINE')event.waitUntil(prepareShell());});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(publicAsset(url)){
  event.respondWith((async()=>{const cache=await caches.open(FARM_CACHE),hit=await cache.match(request);if(hit)return hit;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;})());return;
 }
 if(request.mode==='navigate')event.respondWith(fetch(request).catch(async()=>{
  const shell=await (await caches.open(FARM_CACHE)).match(FARM_SHELL);
  return shell||new Response('Reconnect to open the Farm app.',{status:503,headers:{'Content-Type':'text/plain'}});
 }));
});
