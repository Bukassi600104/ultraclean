import {spawnSync} from 'node:child_process';
for(const name of ['database','workbook','api','ui']){
 const r=spawnSync(process.execPath,['scripts/test-legacy-manager-export-'+name+'.mjs'],{encoding:'utf8',timeout:240000});process.stdout.write(r.stdout||'');if(r.status!==0){process.stderr.write(r.stderr||String(r.error));process.exit(1);}
}
console.log('PASS restricted historical XLSX export workflows');
