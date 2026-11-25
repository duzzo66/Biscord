// JavaScript / download-assets.mjs / Node.js 22+ / Windows
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const records = new Map();
const queue = [];
const assetExt = /\.(?:css|js|mjs|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mov|mp3|ogg|wav|json|lottie)(?:$|\?)/i;
function add(raw, base) {
  try {
    const value = raw.replace(/&amp;/g, '&').replace(/\\u002[fF]/g, '/').replace(/\\\//g, '/');
    if (value.includes(",https://") || value.endsWith("?id=")) return; const u = new URL(value, base); u.hash = '';
    if (!/^https?:$/.test(u.protocol) || !assetExt.test(u.pathname + u.search) || records.has(u.href)) return;
    const parts = u.pathname.split('/').filter(Boolean).map(p => p.replace(/[<>:"\\|?*\x00-\x1f]/g, '_').slice(0, 170));
    if (u.search) parts[parts.length - 1] = parts.at(-1).replace(/(\.[^.]+)$/, '-' + crypto.createHash('sha256').update(u.search).digest('hex').slice(0, 10) + '$1');
    const rec = {url:u.href, file:path.join('assets', u.hostname, ...parts), status:'pending'};
    records.set(u.href, rec); queue.push(rec);
  } catch {}
}
function scan(text, base) {
  const normalized = text.replace(/\\\//g, '/').replace(/\\u002[fF]/g, '/');
  for (const m of normalized.matchAll(/(?:https?:)?\/\/[^\s"'<>`\\)]+/g)) add(m[0], base);
  for (const m of normalized.matchAll(/(?:src|href|poster|data-src|data-poster-url|data-video-urls)\s*=\s*["']([^"']+)["']/gi)) {
    for (const v of m[1].split(',')) add(v.trim(),base);
  }
  for (const m of normalized.matchAll(/srcset\s*=\s*["']([^"']+)["']/gi)) for (const v of m[1].split(',')) add(v.trim().split(/\s+/)[0],base);
  for (const m of normalized.matchAll(/url\(\s*["']?([^\s)"']+)/gi)) add(m[1],base);
  for (const m of normalized.matchAll(/["']([^"'\s]+\.(?:woff2?|ttf|otf|png|svg|webp|avif|mp4|webm|json)(?:\?[^"'\s]*)?)["']/gi)) add(m[1],base);
}
async function get(url) {
  let last;
  for(let i=0;i<3;i++) try {
    const r=await fetch(url,{signal:AbortSignal.timeout(90000)});
    if(!r.ok) throw Error('HTTP '+r.status);
    return {buffer:Buffer.from(await r.arrayBuffer()),type:r.headers.get('content-type')||''};
  } catch(e){last=e;}
  throw last;
}
const home=await get('https://discord.com/');
await fs.writeFile(path.join(root,'index.original.html'),home.buffer);
scan(home.buffer.toString(),'https://discord.com/');
for(let cursor=0;cursor<queue.length;) {
  const batch=queue.slice(cursor,cursor+8); cursor+=batch.length;
  await Promise.all(batch.map(async rec=>{
    try {
      const {buffer,type}=await get(rec.url);
      await fs.mkdir(path.dirname(path.join(root,rec.file)),{recursive:true});
      await fs.writeFile(path.join(root,rec.file),buffer);
      Object.assign(rec,{status:'downloaded',bytes:buffer.length,contentType:type});
      if(/css/.test(type) || /\.css(\?|$)/.test(rec.url)) scan(buffer.toString(),rec.url);
    } catch(e){rec.status='failed';rec.error=e.message;}
  }));
  console.log(`${Math.min(cursor,queue.length)}/${queue.length} processed`);
}
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify({source:'https://discord.com/',downloadedAt:new Date().toISOString(),scope:'Public assets referenced in homepage HTML and CSS dependencies',assets:[...records.values()]},null,2));
const ok=[...records.values()].filter(r=>r.status==='downloaded');
console.log(JSON.stringify({downloaded:ok.length,failed:records.size-ok.length,bytes:ok.reduce((s,r)=>s+r.bytes,0)}));


