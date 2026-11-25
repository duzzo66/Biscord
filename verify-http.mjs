// JavaScript / verify-http.mjs / Node.js 22+ / local HTTP route verification
import fs from 'node:fs/promises';
const routes=JSON.parse(await fs.readFile(new URL('./dist/route-map.json',import.meta.url),'utf8'));
const paths=Object.keys(routes);let cursor=0;const failures=[];
await Promise.all(Array.from({length:12},async()=>{while(cursor<paths.length){const route=paths[cursor++];try{const r=await fetch('http://127.0.0.1:4173'+route,{method:'HEAD',signal:AbortSignal.timeout(10000)});if(!r.ok)failures.push({route,status:r.status});}catch(e){failures.push({route,error:e.message});}}}));
const result={checked:paths.length,failures,verifiedAt:new Date().toISOString()};await fs.writeFile(new URL('./dist/verification-http.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(failures.length)process.exitCode=1;
