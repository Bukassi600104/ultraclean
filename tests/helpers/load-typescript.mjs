import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),ts=require('typescript');
export function typescriptLoader(overrides={}){
 const cache=new Map();
 function load(filename){const file=path.resolve(filename);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);
  const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  function resolve(name){if(name in overrides)return overrides[name];if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');return require(name);}
  new Function('require','module','exports',source)(resolve,module,module.exports);return module.exports;
 }return load;
}
