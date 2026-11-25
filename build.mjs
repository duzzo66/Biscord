// JavaScript / build.mjs / Node.js 22+ / local Discord homepage
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const dist=path.join(root,'dist');
const manifest=JSON.parse((await fs.readFile(path.join(root,'manifest.json'),'utf8')).replace(/^\uFEFF/,''));
const assets=manifest.assets.filter(a=>a.status==='downloaded');
const homepage=assets.find(a=>a.url.endsWith('/homepageRefreshLatest.js'));
const homepageSource=await fs.readFile(path.join(root,homepage.file),'utf8');
for(const match of homepageSource.matchAll(/pt:"(https:[^"]+\.mp4)"/g)){
 const url=match[1];const file='assets/cdn.discordapp.com/assets/content/'+new URL(url).pathname.split('/').at(-1);
 try{await fs.access(path.join(root,file));}catch{const response=await fetch(url);if(!response.ok)throw Error(`${url}: ${response.status}`);await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),Buffer.from(await response.arrayBuffer()));}
 assets.push({url,file,status:'downloaded'});
}
const urls=new Map(assets.map(a=>[a.url,'/'+a.file.split(/[\\/]/).map(encodeURIComponent).join('/')]));
function resolve(raw,base){try{return urls.get(new URL(raw.replace(/&amp;/g,'&'),base).href)||raw;}catch{return raw;}}
function rewrite(text,base){
  text=text.replace(/(?:https?:)?\/\/[^\s"'<>`\\)]+/g,raw=>raw.split(',').map(u=>resolve(u,base)).join(','));
  text=text.replace(/url\(\s*(["']?)([^)"']+)\1\s*\)/g,(m,q,u)=>`url(${q}${resolve(u.trim(),base)}${q})`);
  return text.replace(/\b(src|href|poster|data-src|data-json-url)=(["'])([^"']+)\2/g,(m,k,q,v)=>`${k}=${q}${resolve(v,base)}${q}`);
}
await fs.mkdir(dist,{recursive:true});
for(const a of assets){
 const dest=path.join(dist,a.file);await fs.mkdir(path.dirname(dest),{recursive:true});
 if(/\.(css|json)(?:\?|$)/i.test(a.url))await fs.writeFile(dest,rewrite(await fs.readFile(path.join(root,a.file),'utf8'),a.url));
 else if(a===homepage){let code=homepageSource;for(const [url,local] of urls)code=code.replaceAll(url,local);await fs.writeFile(dest,code);}
 else await fs.copyFile(path.join(root,a.file),dest);
}
let html=await fs.readFile(path.join(root,'index.original.html'),'utf8');
// Keep Webflow's original interactions; replace remote app, analytics, and localization runtimes.
html=html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(tag,attrs,body)=>{
 const src=attrs.match(/\bsrc=["']([^"']+)/)?.[1];
 if(src && (/jquery-3\.5\.1|\/js\/discord-2022\./.test(src))) return tag;
 if(!src && /w-mod-|menu-button/.test(body))return tag;
 return '';
});
html=html.replace(/\s(?:integrity|crossorigin|nonce)="[^"]*"/g,'');
html=html.replace(/<link\b[^>]*rel="(?:preconnect|canonical)"[^>]*>/g,'');
html=html.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/g,'');
html=rewrite(html,'https://discord.com/');
html=html.replace(/\bhref="(\/[^/][^"]*)"/g,(m,v)=>v.startsWith('/assets/')?m:`href="https://discord.com${v}"`);
html=html.replace(/href="(?:https:\/\/discord\.com\/|\/\/discord\.com\/)"/g,'href="/"');
html=html.replace(/<html\b/,'<html data-local-copy="true"');
html=html.replace('</head>','<link rel="stylesheet" href="/local.css"/><script src="/localize.js"></script></head>');
html=html.replace('</body>',`<script src="${urls.get(homepage.url)}" defer></script><script src="/interactions.js"></script></body>`);
await fs.writeFile(path.join(dist,'index.html'),html);
for(const file of ['local.css','localize.js','interactions.js'])await fs.copyFile(path.join(root,file),path.join(dist,file));
console.log(`Built home page with ${assets.length} local assets: ${dist}`);
try{await fs.access(path.join(root,'mirror-manifest.json'));const result=spawnSync(process.execPath,[path.join(root,'render-mirror.mjs')],{cwd:root,stdio:'inherit'});if(result.status)process.exitCode=result.status;}catch(e){if(e.code!=='ENOENT')throw e;}
await import('./build-auth.mjs');
