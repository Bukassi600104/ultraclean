import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import ts from 'typescript';
const compiled=ts.transpileModule(readFileSync('lib/farm-photo-prepare.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const server=createServer((req,res)=>res.end('<!doctype html><title>Isolated photo test</title>'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 const result=await page.evaluate(async code=>{const module={exports:{}};new Function('exports',code)(module.exports);const prepare=module.exports.prepareFarmPhoto;
 const canvas=document.createElement('canvas');canvas.width=3000;canvas.height=2000;canvas.getContext('2d').fillRect(0,0,3000,2000);
 const original=await new Promise(r=>canvas.toBlob(r,'image/png')),upload=await prepare(original),decoded=await createImageBitmap(upload);
 let invalid=false;try{await prepare(new Blob(['not a photo'],{type:'image/jpeg'}));}catch{invalid=true;}
 return {type:upload.type,width:decoded.width,height:decoded.height,small:upload.size<=3*1024*1024,original:original.type,invalid};},compiled);
 assert.deepEqual(result,{type:'image/jpeg',width:2000,height:1333,small:true,original:'image/png',invalid:true});
 console.log('PASS camera photo normalization: bounded JPEG, original retained, invalid bytes rejected');
}finally{await browser.close();await new Promise(r=>server.close(r));}
