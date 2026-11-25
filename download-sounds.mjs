// JavaScript / download-sounds.mjs / Node.js 24+ / public Discord audio assets
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const html=await(await fetch('https://discord.com/channels/@me')).text();
const source=html.match(/(?:href|src)="(\/assets\/web\.[a-f\d]+\.js)"/)?.[1];
if(!source)throw Error('Public client bundle not found');
const code=await(await fetch('https://discord.com'+source)).text();
const entries=[...code.matchAll(/"\.\/([^"/]+\.mp3)":"(\d+)"/g)];
await fs.mkdir('client/assets/sounds',{recursive:true});
const results=[];let cursor=0;
await Promise.all(Array.from({length:5},async()=>{while(cursor<entries.length){const [,name,id]=entries[cursor++];if(!/^[a-z0-9_-]+\.mp3$/i.test(name))continue;const start=new RegExp('(?:^|[,{}])'+id+'\\([^)]*\\)\\{').exec(code);const file=start?code.slice(start.index,start.index+200).match(/\.exports=\w+\.p\+"([a-f\d]+\.mp3)"/)?.[1]:null;if(!file){results.push({name,status:'missing'});continue;}const url='https://discord.com/assets/'+file;let response;for(let attempt=0;attempt<3;attempt++){response=await fetch(url);if(response.ok)break;}if(!response.ok){results.push({name,url,status:response.status});continue;}const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<128||bytes.length>20000000||bytes.subarray(0,50).toString().includes('<!DOCTYPE'))throw Error('Invalid audio: '+name);await fs.writeFile('client/assets/sounds/'+name,bytes);results.push({name,url,status:'downloaded',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}}));
results.sort((a,b)=>a.name.localeCompare(b.name));
await fs.writeFile('client/assets/sounds/manifest.json',JSON.stringify({source:'https://discord.com'+source,downloadedAt:new Date().toISOString(),files:results},null,2));
console.log(JSON.stringify({downloaded:results.filter(r=>r.status==='downloaded').length,unavailable:results.filter(r=>r.status!=='downloaded'),bytes:results.reduce((n,r)=>n+(r.bytes||0),0)}));
