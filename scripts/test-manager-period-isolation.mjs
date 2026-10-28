import {spawnSync} from 'node:child_process';
const scripts=[
 'test-manager-periods-database.mjs','test-manager-scoped-writes.mjs','test-manager-scope-api.mjs','test-manager-offline-identity.mjs','test-manager-scope-ui.mjs',
 'test-manager-accounts.mjs','test-manager-accounts-ui.mjs','test-bossbimbz-routing.mjs','test-bossbimbz-access.mjs',
 'test-bossbimbz-property.mjs','test-bossbimbz-property-ui.mjs','test-bossbimbz-content.mjs','test-bossbimbz-content-ui.mjs',
 'test-farm-v2-api.mjs','test-farm-livestock-api.mjs','test-bossbimbz-farm-api.mjs','test-bossbimbz-feed-api.mjs'
];
for(const script of scripts){const result=spawnSync(process.execPath,['scripts/'+script],{encoding:'utf8',timeout:180000});process.stdout.write(result.stdout||'');if(result.status!==0){process.stderr.write(result.stderr||String(result.error));process.exit(1);}}
console.log('PASS all '+scripts.length+' manager-isolation and existing-workflow suites');
