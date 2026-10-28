import {spawnSync} from 'node:child_process';
for(const name of ['test-ceo-manager-report','test-ceo-manager-report-api','test-manager-report-metrics','test-ceo-manager-report-ui','test-manager-business-cash','test-manager-funds-api','test-manager-personal-finance','test-manager-period-isolation','test-operations-cash','test-bossbimbz-ceo-api','test-bossbimbz-ceo-data','test-ceo-operations-ui','test-dashboard-navigation','test-dashboard-reporting-api','test-farm-v2-ui']){
 const result=spawnSync(process.execPath,['scripts/'+name+'.mjs'],{encoding:'utf8',timeout:240000});process.stdout.write(result.stdout||'');if(result.status!==0){process.stderr.write(result.stderr||String(result.error));process.exit(1);}
}
console.log('PASS individual reports, custody reconciliation, period lifecycle and existing workflows');
