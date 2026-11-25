// JavaScript / download-nameplates.mjs / Node.js 24 / Discord CDN nameplate mirror
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='client/assets/collectibles',raw=[],sources=[];
for(let page=1;;page++){
 const url=`https://dripcord.me/api/catalog/?type=NAMEPLATE&page=${page}&page_size=100&sort=recent`;
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Catalog '+response.status);
 const data=await response.json();sources.push(url);
 for(const item of data.items||[])if(item.type==='NAMEPLATE'&&!raw.some(x=>x.skuId===item.skuId))raw.push(item);
 if(!data.hasMore)break;if(page>=100)throw Error('Unbounded catalog');
}
await fs.writeFile('reference-client/nameplates-catalog.json',JSON.stringify(raw,null,2));
const catalog=JSON.parse(await fs.readFile(root+'/catalog.json','utf8'));
const downloads=JSON.parse(await fs.readFile(root+'/downloads.json','utf8')),byUrl=new Map(downloads.filter(x=>x.ok).map(x=>[x.url,x]));
const urls=[...new Set(raw.flatMap(x=>[x.staticImageUrl,x.animatedImageUrl]).filter(Boolean))],failures=[];let index=0;
await Promise.all(Array.from({length:6},async()=>{for(;;){const url=urls[index++];if(!url)return;
 if(new URL(url).hostname!=='cdn.discordapp.com')throw Error('Unexpected asset host');
 const old=byUrl.get(url);if(old)try{await fs.access('.'+old.local);continue;}catch{}
 let error;for(let retry=0;retry<3;retry++)try{
 const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('HTTP '+response.status);
 const mime=response.headers.get('content-type')?.split(';')[0],ext={'image/png':'png','image/webp':'webp','video/webm':'webm'}[mime];if(!ext)throw Error('Unexpected MIME '+mime);
 const bytes=Buffer.from(await response.arrayBuffer()),local='/'+root+'/media/'+createHash('sha256').update(url).digest('hex').slice(0,28)+'.'+ext;
 await fs.writeFile('.'+local,bytes);byUrl.set(url,{url,local,mime,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),ok:true});error=null;break;
 }catch(e){error=e;}if(error)failures.push({url,error:error.message});
}}));
const items=raw.map(x=>({id:x.skuId,kind:'nameplate',name:x.name,collection:x.collectionDisplayName||x.collectionName||'',palette:x.palette||'cobalt',colors:x.colors||[],thumbnail:byUrl.get(x.staticImageUrl)?.local,animated:byUrl.get(x.animatedImageUrl)?.local,effects:[],layers:{}})).filter(x=>x.thumbnail||x.animated);
catalog.items=[...catalog.items.filter(x=>x.kind!=='nameplate'),...items];catalog.sources=[...new Set([...catalog.sources,...sources])];catalog.updatedAt=new Date().toISOString();
await fs.writeFile(root+'/downloads.json',JSON.stringify([...byUrl.values()],null,2));await fs.writeFile(root+'/catalog.json',JSON.stringify(catalog,null,2));
await fs.writeFile('reference-client/nameplates-failures.json',JSON.stringify(failures,null,2));
console.log('Downloaded',items.length,'nameplates,',urls.length-failures.length,'CDN assets;',failures.length,'unavailable assets; existing cosmetics preserved.');
