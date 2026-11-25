// JavaScript / mirror.mjs / Node.js 22+ / resumable public Discord content mirror
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {load} from 'cheerio';
const root=path.dirname(fileURLToPath(import.meta.url));
const docs=process.argv.includes('--docs');
const sdk=process.argv.includes('--sdk');
const captureMode=process.argv.includes('--captures');
const captureSources=captureMode?JSON.parse(await fs.readFile(path.join(root,'captures/manifest.json'),'utf8')):[];
const stateFile=path.join(root,captureMode?'captures-manifest.json':sdk?'sdk-manifest.json':docs?'docs-manifest.json':'mirror-manifest.json');
const origin=docs?'https://docs.discord.com':'https://discord.com';
const excluded=/^\/(?:login|register|app|channels|invite|oauth2|api|assets|w|cdn-cgi|verify|reset|activate|billing|store|gifts|quests|checkout|events|profile|users|announcements)(?:\/|$)/i;
const directoryRecord=/^\/(?:servers|application-directory|application-directory-seo|trending-games|game)\//i;
const binary=/\.(?:png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|woff2?|ttf|otf|eot|mp4|webm|mp3|ogg|wav|json|lottie|pdf|txt)(?:$|\?)/i;
const download=/\.(?:exe|dmg|deb|rpm|tar|gz|zip|msi|apk|zst)(?:$|\?)/i;
let state;try{state=JSON.parse(await fs.readFile(stateFile,'utf8'));}catch{state={source:origin,scope:'Institutional pages, articles and documentation; directory landing pages only',pages:[],assets:[],external:[],excluded:[]};}
const pages=new Map(state.pages.map(p=>[p.url,p]));
const assets=new Map(state.assets.map(a=>[a.url,a]));
const old=JSON.parse((await fs.readFile(path.join(root,'manifest.json'),'utf8')).replace(/^\uFEFF/,''));
for(const a of old.assets)if(a.status==='downloaded'&&!assets.has(a.url))assets.set(a.url,{...a,existing:true});
const queue=[],assetQueue=[];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function pageUrl(raw,base=origin){try{
 if(!raw||typeof raw!=='string')return null;
 const u=new URL(raw,base);if(u.origin!==origin||excluded.test(u.pathname)||directoryRecord.test(u.pathname)||binary.test(u.pathname)||download.test(u.pathname)||u.pathname.includes('/cdn-cgi/'))return null;
 if(sdk&&!u.pathname.startsWith('/developers/docs/social-sdk/'))return null;
 u.hash='';for(const key of [...u.searchParams.keys()])if(!/^(?:page|.*_page)$/.test(key))u.searchParams.delete(key);
 u.pathname=u.pathname.replace(/\/+$/,'')||'/';u.searchParams.sort();if(captureMode&&!captureSources.some(p=>p.url===u.href))return null;return u.href;
}catch{return null;}}
function addPage(raw,base){const url=pageUrl(raw,base);if(!url)return;let rec=pages.get(url);if(!rec){rec={url,status:'pending',file:'pages/'+hash(url)+'.html'};pages.set(url,rec);}if(rec.status==='pending'&&!rec.queued){rec.queued=true;queue.push(rec);}}
function assetUrl(raw,base){try{const u=new URL(raw.replaceAll('&amp;','&'),base);u.hash='';if(!/^https?:$/.test(u.protocol)||download.test(u.pathname)||/googletagmanager|google-analytics|localizeapi|onetrust|hubspot|facebook\.net|analytics/i.test(u.href))return null;return u.href;}catch{return null;}}
function addAsset(raw,base){const url=assetUrl(raw,base);if(!url||url===origin+'/')return;let rec=assets.get(url);if(!rec){const u=new URL(url);const name=decodeURIComponent(u.pathname.split('/').at(-1)||'resource').replace(/[^\w.\-]/g,'_').slice(-85);rec={url,file:'assets/mirror/'+hash(url).slice(0,20)+'-'+name,status:'pending'};assets.set(url,rec);}if(rec.status==='pending'&&!rec.queued){rec.queued=true;assetQueue.push(rec);}}
function scanCss(text,base){
 const decode=s=>s.replace(/\\([0-9a-f]{1,6})\s?|\\(.)/gi,(_,hex,char)=>hex?String.fromCodePoint(parseInt(hex,16)):char);
 for(const m of text.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|((?:\\.|[^)\s])+))\s*\)|@import\s+["']([^"']+)/g)){const u=decode(m[1]??m[2]??m[3]??m[4]);if(u&&!u.startsWith('data:')&&!u.startsWith('#'))addAsset(u,base);}
}
function scanHtml(text,base){const $=load(text);
 $('a[href]').each((_,el)=>{const href=$(el).attr('href');if(binary.test(href||'')&&!download.test(href||''))addAsset(href,base);else addPage(href,base);});
 $('img,source,video,audio,script,iframe,link,object,[data-src],[data-json-url],[data-poster-url],[data-video-urls]').each((_,el)=>{
  const tag=el.tagName;const a=el.attribs;
  if(tag==='iframe')return;
  if(tag==='link'&&!/stylesheet|icon|preload|modulepreload/.test(a.rel||''))return;
  if(tag==='link'&&a.as==='document')return;
  for(const key of ['src','poster','data-src','data-json-url','data-poster-url','data'])if(a[key]&&!a[key].startsWith('data:'))addAsset(a[key],base);
  if(tag==='link'&&a.href)addAsset(a.href,base);
  for(const entry of (a.srcset||'').split(',')){const v=entry.trim().split(/\s+/)[0];if(v&&!v.startsWith('data:'))addAsset(v,base);}
  for(const v of (a['data-video-urls']||'').split(','))if(v)addAsset(v,base);
 });
 $('style').each((_,el)=>scanCss($(el).html()||'',base));$('[style]').each((_,el)=>scanCss($(el).attr('style'),base));
 return {title:$('title').text(),headings:$('h1').map((_,el)=>$(el).text().trim()).get(),webflow:!!$('html[data-wf-site]').length,bodyChars:$('body').text().length};
}
async function fetchResource(url,timeout=45000){let error;for(let i=0;i<2;i++)try{const r=await fetch(url,{signal:AbortSignal.timeout(timeout),headers:{'User-Agent':'Mozilla/5.0 (compatible; LocalPageArchive/1.0)','Accept-Language':'en-US,en;q=0.8'}});if(!r.ok)throw Error('HTTP '+r.status);return {buffer:Buffer.from(await r.arrayBuffer()),type:r.headers.get('content-type')||'',final:r.url};}catch(e){error=e;if(/HTTP (?:403|404|410)/.test(e.message))break;}throw error;}
async function checkpoint(){state.pages=[...pages.values()].map(({queued,...p})=>p);state.assets=[...assets.values()].map(({queued,...a})=>a);state.updatedAt=new Date().toISOString();await fs.writeFile(stateFile,JSON.stringify(state,null,2));}
for(const [url,page] of pages)if(/\.txt$/.test(url)&&page.error?.startsWith('Not HTML:')){pages.delete(url);addAsset(url,origin);}
await fs.mkdir(path.join(root,'pages'),{recursive:true});
if(!process.argv.includes('--assets-only')){
if(captureMode){for(const p of captureSources)addPage(p.url);}else if(sdk){addPage('/developers/docs/social-sdk/index.html');}else if(docs){addPage('/developers/intro');}else{addPage('/');const inventory=JSON.parse(await fs.readFile(path.join(root,'page-inventory.json'),'utf8'));for(const p of inventory.pages)addPage(p.url);}
if(!captureMode){try{const counterpart=JSON.parse(await fs.readFile(path.join(root,docs?'mirror-manifest.json':'docs-manifest.json'),'utf8'));for(const page of counterpart.pages)if(page.redirect)addPage(page.redirect);}catch{}}
for(const rec of pages.values()){if(rec.status==='downloaded'){try{scanHtml(await fs.readFile(path.join(root,rec.file),'utf8'),rec.url);}catch{rec.status='pending';}}if(rec.status==='pending')addPage(rec.url);}
if(process.argv.includes('--retry')){for(const p of pages.values())if(p.status==='failed'){p.status='pending';delete p.error;addPage(p.url);}for(const a of assets.values())if(a.status==='failed'){a.status='pending';delete a.error;addAsset(a.url,origin);}}
if(process.argv.includes('--inventory-only')){console.log(JSON.stringify({pages:pages.size,assets:assets.size}));await checkpoint();process.exit(0);}
for(let cursor=0;cursor<queue.length;){const batch=queue.slice(cursor,cursor+8);cursor+=batch.length;
 await Promise.all(batch.map(async rec=>{try{
  let result;const capture=captureSources.find(p=>p.url===rec.url);if(capture)result={buffer:await fs.readFile(path.join(root,capture.file)),type:'text/html',final:rec.url};else if(!docs&&new URL(rec.url).pathname==='/'&&!new URL(rec.url).search)result={buffer:await fs.readFile(path.join(root,'index.original.html')),type:'text/html',final:rec.url};else result=await fetchResource(rec.url);
  if(!result.type.includes('text/html'))throw Error('Not HTML: '+result.type);
  if(new URL(result.final).origin!==origin){Object.assign(rec,{status:'external',redirect:result.final});return;}
  await fs.writeFile(path.join(root,rec.file),result.buffer);Object.assign(rec,{status:'downloaded',bytes:result.buffer.length,finalUrl:result.final,...scanHtml(result.buffer.toString(),rec.url)});
 }catch(e){rec.status='failed';rec.error=e.message;}}));
 await checkpoint();console.log(JSON.stringify({phase:'pages',processed:cursor,discovered:pages.size,queued:queue.length,downloaded:[...pages.values()].filter(p=>p.status==='downloaded').length}));
}
}
// CSS/JSON dependencies from the earlier homepage archive also participate.
for(const a of assets.values())if(a.status==='downloaded'&&/\.css(?:\?|$)/.test(a.url))try{scanCss(await fs.readFile(path.join(root,a.file),'utf8'),a.url);}catch{}
if(sdk)for(const a of [...assets.values()])if(a.status==='downloaded'&&a.url.endsWith('/navtreedata.js')){
 const source=await fs.readFile(path.join(root,a.file),'utf8');const list=source.match(/(?:var|const|let)\s+NAVTREEINDEX\s*=\s*\[([\s\S]*?)\]/)?.[1];
 const count=list?[...list.matchAll(/"[^"]*"/g)].length:0;for(let i=0;i<count;i++)addAsset('navtreeindex'+i+'.js',a.url);
}
if(sdk)for(const a of [...assets.values()])if(a.status==='downloaded'&&a.url.startsWith(origin+'/developers/docs/social-sdk/')&&a.url.endsWith('.js')){
 const source=await fs.readFile(path.join(root,a.file),'utf8');for(const m of source.matchAll(/["']([^"'\s]+\.(?:png|svg|gif|js))["']/g))if(!m[1].includes('+'))addAsset(m[1],a.url);
}
for(const a of assets.values())if(a.status==='pending')addAsset(a.url,origin);
let cursor=0,completed=0,saveChain=Promise.resolve();
await Promise.all(Array.from({length:16},async()=>{while(cursor<assetQueue.length){const rec=assetQueue[cursor++];try{
  let cached;try{const data=await fs.readFile(path.join(root,rec.file));if(data.length)cached={buffer:data,type:/\.css(?:\?|$)/.test(rec.url)||/^\s*(?:@font-face|@charset|@import|:root)/.test(data.subarray(0,100).toString())?'text/css':''};}catch{}
  const {buffer,type}=cached||await fetchResource(rec.url);if(type.includes('text/html'))throw Error('HTML returned for asset');
  await fs.mkdir(path.dirname(path.join(root,rec.file)),{recursive:true});await fs.writeFile(path.join(root,rec.file),buffer);Object.assign(rec,{status:'downloaded',bytes:buffer.length,contentType:type});
  if(type.includes('css')||/\.css(?:\?|$)/.test(rec.url))scanCss(buffer.toString(),rec.url);
  if(type.includes('json')||/\.json(?:\?|$)/.test(rec.url)){try{const data=JSON.parse(buffer);for(const a of data.assets||[])if(a.p&&!a.e)addAsset((a.u||'')+a.p,rec.url);}catch{}}
 }catch(e){rec.status='failed';rec.error=e.message;}
 completed++;if(completed%120===0){saveChain=saveChain.then(checkpoint);await saveChain;console.log(JSON.stringify({phase:'assets',processed:completed,queued:assetQueue.length,downloaded:[...assets.values()].filter(a=>a.status==='downloaded').length}));}
}}));await saveChain;
await checkpoint();console.log(JSON.stringify({complete:true,pages:state.pages.length,downloadedPages:state.pages.filter(p=>p.status==='downloaded').length,failedPages:state.pages.filter(p=>p.status==='failed').length,assets:state.assets.length,failedAssets:state.assets.filter(a=>a.status==='failed').length}));
