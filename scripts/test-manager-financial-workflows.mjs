import {spawnSync} from 'node:child_process';
for(const name of ['test-manager-business-cash','test-manager-business-cash-api','test-manager-personal-finance','test-manager-funds-ui','test-manager-financial-submission-ui','test-manager-farm-finance-ui','test-manager-other-finance-ui','test-operations-cash','test-manager-period-isolation','test-farm-v2-ui']){
 const result=spawnSync(process.execPath,['scripts/'+name+'.mjs'],{encoding:'utf8',timeout:240000});process.stdout.write(result.stdout||'');if(result.status!==0){process.stderr.write(result.stderr||String(result.error));process.exit(1);}
}
console.log('PASS manager financial workflows and existing app integration');
