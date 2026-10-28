import {spawnSync} from 'node:child_process';
for(const name of ['test-manager-handover-database.mjs','test-manager-handover-api.mjs','test-manager-handover-ui.mjs','test-manager-scoped-writes.mjs','test-manager-scope-api.mjs','test-manager-scope-ui.mjs']){
 const result=spawnSync(process.execPath,['scripts/'+name],{encoding:'utf8',timeout:180000});process.stdout.write(result.stdout||'');if(result.status!==0){process.stderr.write(result.stderr||String(result.error));process.exit(1);}
}
console.log('PASS handover and manager-boundary integration suites');
