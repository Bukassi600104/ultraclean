import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
for(const app of ['property','content']){
 assert.ok(existsSync(`public/${app}-manifest.json`),`${app} requires its own install identity`);
 const manifest=JSON.parse(readFileSync(`public/${app}-manifest.json`,'utf8'));
 assert.equal(manifest.id,`/${app}`);assert.equal(manifest.start_url,`/${app}`);assert.equal(manifest.scope,`/${app}`);assert.equal(manifest.display,'standalone');
 assert.deepEqual(manifest.icons.map(icon=>icon.sizes),['192x192','512x512']);
 const worker=readFileSync(`public/${app}-sw.js`,'utf8');assert.match(worker,/fetch\(event.request/);assert.doesNotMatch(worker,/caches\.|indexedDB|localStorage|Authorization/);
 const layout=readFileSync(`app/(${app})/${app}/layout.tsx`,'utf8');assert.match(layout,new RegExp(`${app}-manifest.json`));assert.match(layout,/appleWebApp/);assert.match(layout,/AppInstallPrompt/);
}
console.log('PASS: 22 isolated PWA manifest/metadata/network-only worker contract checks');
