import {spawnSync} from 'node:child_process';
for(const name of ['test-feed-inventory-workflow','test-feed-legacy-preservation','test-bossbimbz-feed-api','test-bossbimbz-daily-feed-api','test-bossbimbz-feed-ui','test-manager-handover-database','test-manager-handover-ui','test-manager-scope-api']){
 const result=spawnSync(process.execPath,['scripts/'+name+'.mjs'],{encoding:'utf8',timeout:180000});process.stdout.write(result.stdout||'');if(result.status!==0){process.stderr.write(result.stderr||String(result.error));process.exit(1);}
}
console.log('PASS manager feed, preservation, handover and API integration suites');
