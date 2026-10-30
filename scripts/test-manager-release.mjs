import {spawnSync} from 'node:child_process';
// Explicit isolated suites only: older ad-hoc Auth scripts can mutate production.
const suites=[
 'test-farm-stores','test-farm-stores-api','test-farm-stores-ui',
 'test-farm-purchases','test-farm-purchases-api','test-farm-purchases-ui',
 'test-farm-batch-stock','test-farm-batch-records','test-farm-batch-records-api','test-farm-record-messages','test-farm-media-record-sync','test-farm-batch-inputs','test-farm-photo-prepare','test-farm-today-ui',
 'test-farm-batches-database','test-farm-batches-api',
 'test-farm-evidence-image','test-farm-evidence-database','test-farm-evidence-api','test-farm-offline-media',
 'test-manager-legacy-custody','test-manager-rollout-database','test-manager-periods-database','test-manager-scoped-writes','test-manager-scope-api','test-manager-offline-identity','test-manager-scope-ui',
 'test-manager-accounts','test-manager-accounts-ui','test-bossbimbz-routing','test-bossbimbz-access','test-bossbimbz-property','test-bossbimbz-property-ui','test-bossbimbz-content','test-bossbimbz-content-ui',
 'test-manager-handover-database','test-manager-handover-api','test-manager-handover-ui','test-feed-inventory-workflow','test-feed-legacy-preservation','test-bossbimbz-feed-api','test-bossbimbz-daily-feed-api','test-bossbimbz-feed-ui',
 'test-operations-custody-database','test-exact-money','test-manager-funds-api','test-manager-business-cash','test-manager-business-cash-api','test-manager-personal-finance','test-manager-funds-ui','test-manager-financial-submission-ui','test-manager-farm-finance-ui','test-manager-other-finance-ui',
 'test-ceo-manager-report','test-ceo-manager-report-api','test-manager-report-metrics','test-ceo-manager-report-ui',
 'test-legacy-manager-export-database','test-legacy-manager-export-workbook','test-legacy-manager-export-api','test-legacy-manager-export-ui',
 'test-bossbimbz-ceo-api','test-bossbimbz-ceo-data','test-bossbimbz-ceo-ui','test-ceo-operations-ui','test-dashboard-navigation','test-dashboard-navigation-ui','test-dashboard-reporting-api','test-ceo-control-center-ui',
 'test-farm-v2-calculations','test-farm-v2-api','test-farm-v2-ui','test-bossbimbz-farm-api','test-bossbimbz-farm-ui','test-farm-livestock-api','test-farm-livestock-categories','test-farm-livestock-ledger','test-farm-livestock-ui',
 'test-bossbimbz-pwa','test-bossbimbz-pwa-ui','test-operational-navigation-ui','test-unsaved-navigation-ui'
];
for(const name of suites){
 const result=spawnSync(process.execPath,['scripts/'+name+'.mjs'],{encoding:'utf8',timeout:300000,env:{...process.env,FORMS_ONLY:''}});
 process.stdout.write(result.stdout||'');
 if(result.status!==0){process.stderr.write(name+' failed\n'+(result.stderr||String(result.error)));process.exit(1);}
}
console.log('PASS all '+suites.length+' explicitly isolated manager release suites');
