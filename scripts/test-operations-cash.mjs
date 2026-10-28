import {spawnSync} from 'node:child_process';
for(const name of ['test-operations-custody-database','test-manager-funds-api','test-exact-money','test-farm-v2-calculations','test-farm-v2-api','test-manager-scoped-writes','test-feed-inventory-workflow']){
 const result=spawnSync(process.execPath,['scripts/'+name+'.mjs'],{encoding:'utf8',timeout:180000});process.stdout.write(result.stdout||'');if(result.status!==0){process.stderr.write(result.stderr||String(result.error));process.exit(1);}
}
console.log('PASS custody, money, transfer compatibility and manager-boundary integration suites');
