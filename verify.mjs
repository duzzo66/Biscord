// JavaScript / verify.mjs / Node.js 22+ / local static resource verification
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const html=await fs.readFile(path.join(root,'index.html'),'utf8');
const references=new Set();
for(const m of html.matchAll(/(?:src|href|data-src|data-json-url|poster)=["'](\/assets\/[^"']+)/g))references.add(m[1]);
for(const m of html.matchAll(/srcset=["']([^"']+)/g))for(const item of m[1].split(',')){const url=item.trim().split(/\s+/)[0];if(url.startsWith('/assets/'))references.add(url);}
const failures=[];
for(const url of references){try{const response=await fetch('http://127.0.0.1:4173'+url,{method:'HEAD'});if(!response.ok)failures.push({url,status:response.status});}catch(e){failures.push({url,error:e.message});}}
const report={checked:references.size,failures,sections:(html.match(/<section\b/g)||[]).length,verifiedAt:new Date().toISOString()};
await fs.writeFile(path.join(root,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(failures.length)process.exitCode=1;
