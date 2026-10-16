import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';const require=createRequire(import.meta.url),ts=require('typescript');
const module={exports:{}};new Function('require','module','exports',ts.transpileModule(readFileSync('lib/farm-livestock-categories.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(require,module,module.exports);
const {livestockStages,validClassification}=module.exports;let checks=0;
assert.deepEqual(livestockStages('goat'),['weaner','adolescent','adult']);checks++;
for(const sex of ['male','female','unknown'])for(const stage of ['poult','grower','juvenile','finisher']){assert.ok(validClassification('turkey',{growth_stage:stage,sex,chicken_type:''}));checks++}
assert.equal(validClassification('chicken',{growth_stage:'point_of_lay',chicken_type:'broiler',sex:'unknown'}),false);checks++;
assert.ok(validClassification('cattle',{growth_stage:'stocker_feeder',sex:'female',chicken_type:''}));checks++;
assert.equal(validClassification('pig',{growth_stage:'winners',sex:'unknown',chicken_type:''}),false);checks++;
console.log(`PASS ${checks} livestock catalogue checks`);
