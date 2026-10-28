import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript'),cache=new Map();
export function load(file) {
 file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}};cache.set(file,mod);
 const local=name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name);
 new Function('require','module','exports',ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(local,mod,mod.exports);
 return mod.exports;
}
