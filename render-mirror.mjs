// JavaScript / render-mirror.mjs / Node.js 22+ / build all archived public pages
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from 'cheerio';
const root=path.dirname(fileURLToPath(import.meta.url)),dist=path.join(root,'dist');
function mergeAssets(first,second){const map=new Map(first.map(a=>[a.url,a]));for(const a of second){const before=map.get(a.url);if(!before||before.status!=='downloaded'||a.status==='downloaded')map.set(a.url,a);}return [...map.values()];}
const state=JSON.parse(await fs.readFile(path.join(root,'mirror-manifest.json'),'utf8'));
try{const docs=JSON.parse(await fs.readFile(path.join(root,'docs-manifest.json'),'utf8'));state.pages.push(...docs.pages);state.assets=mergeAssets(state.assets,docs.assets);}catch{}
try{const captured=JSON.parse(await fs.readFile(path.join(root,'captures-manifest.json'),'utf8'));state.pages=[...new Map([...state.pages,...captured.pages].map(p=>[p.url,p])).values()];state.assets=mergeAssets(state.assets,captured.assets);}catch{}
try{const sdk=JSON.parse(await fs.readFile(path.join(root,'sdk-manifest.json'),'utf8'));state.pages=[...new Map([...state.pages,...sdk.pages].map(p=>[p.url,p])).values()];state.assets=mergeAssets(state.assets,sdk.assets);}catch{}
// Keep original remote URLs when an archived public asset is unavailable locally.
const unavailable=state.assets.filter(a=>a.status==='downloaded'&&!existsSync(path.join(root,a.file)));
state.assets=state.assets.filter(a=>a.status!=='downloaded'||existsSync(path.join(root,a.file)));
await fs.mkdir(dist,{recursive:true});
await fs.writeFile(path.join(dist,'unavailable-assets.json'),JSON.stringify(unavailable.map(({url,file})=>({url,file})),null,2));
if(unavailable.length)console.warn(unavailable.length+' archived assets unavailable; original remote URLs retained (see unavailable-assets.json).');
// App-only shells require a signed-in service and are outside the public-page archive.
const appOnly=/^https:\/\/discord\.com\/(?:developers\/home|feature\/|settings\/|redeem(?:\/|$)|report(?:\/|$))/;
const excludedShells=state.pages.filter(p=>p.status==='downloaded'&&appOnly.test(p.url));
state.pages=state.pages.filter(p=>!excludedShells.includes(p));
const successful=state.pages.filter(p=>p.status==='downloaded');
const assetMap=new Map(state.assets.filter(a=>a.status==='downloaded').map(a=>[a.url,'/'+a.file.split(/[\\/]/).map(encodeURIComponent).join('/')]));
const localPaths=new Set(assetMap.values());
const localRoute=url=>{const u=new URL(url);return (u.hostname==='docs.discord.com'?'/documentation':'')+u.pathname+u.search;};
const routes=new Map(successful.map(p=>[p.url,localRoute(p.url)]));
for(const page of state.pages.filter(p=>p.status==='external'))if(routes.has(page.redirect))routes.set(page.url,routes.get(page.redirect));
const routeFiles={};
const localAsset=(raw,base)=>{if(['/polish.css','/polish.js'].includes(raw))return raw;if(localPaths.has(raw))return raw;try{return assetMap.get(new URL(raw,base).href)||new URL(raw,base).href;}catch{return raw;}};
const canonical=u=>{u.pathname=u.pathname.replace(/\/+$/,'')||'/';u.hash='';for(const key of [...u.searchParams.keys()])if(!/^(?:page|.*_page)$/.test(key))u.searchParams.delete(key);u.searchParams.sort();return u;};
function link(raw,base){try{if(!raw||raw.startsWith('#')||/^(?:mailto|tel|javascript):/.test(raw))return raw;const u=new URL(raw,base),hash=u.hash;if(assetMap.has(u.href))return assetMap.get(u.href);if(['https://discord.com','https://docs.discord.com'].includes(u.origin)){const normalized=canonical(new URL(u));if(routes.has(normalized.href))return routes.get(normalized.href)+hash;}return u.href;}catch{return raw;}}
function css(text,base){return text.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|((?:\\.|[^)\s])+))\s*\)/g,(m,double,single,bare)=>{const u=(double??single??bare).replace(/\\([0-9a-f]{1,6})\s?|\\(.)/gi,(_,hex,char)=>hex?String.fromCodePoint(parseInt(hex,16)):char);return u.startsWith('data:')||u.startsWith('#')?m:`url("${localAsset(u,base).replaceAll('"','%22')}")`;}).replace(/(@import\s+["'])([^"']+)/g,(m,p,u)=>p+localAsset(u,base));}
await fs.mkdir(path.join(dist,'_pages'),{recursive:true});
let copied=0;
const renderAssets=state.assets.filter(a=>a.status==='downloaded'&&!new URL(a.url).hostname.endsWith('localizeapi.com')&&(!a.existing||/\.css(?:\?|$)/.test(a.url)));let assetCursor=0;
await Promise.all(Array.from({length:12},async()=>{while(assetCursor<renderAssets.length){const a=renderAssets[assetCursor++];
 const dest=path.join(dist,a.file);await fs.mkdir(path.dirname(dest),{recursive:true});
 if(a.contentType?.includes('css')||/\.css(?:\?|$)/.test(a.url))await fs.writeFile(dest,css(await fs.readFile(path.join(root,a.file),'utf8'),a.url));
 else {let same=false;try{same=(await fs.stat(dest)).size===(await fs.stat(path.join(root,a.file))).size;}catch{}if(!same)await fs.copyFile(path.join(root,a.file),dest);}copied++;
if(copied%1000===0)console.log(`Prepared ${copied} assets`);
}}));
for(let pi=0;pi<successful.length;pi+=6){await Promise.all(successful.slice(pi,pi+6).map(async page=>{
 const original=await fs.readFile(path.join(root,page.file),'utf8');
 const $=load(original);
 const home=page.url==='https://discord.com/';
 const sdkPage=page.url.startsWith('https://discord.com/developers/docs/social-sdk/');
 if(home){const existing=load(await fs.readFile(path.join(dist,'index.html'),'utf8'));existing('a[href]').each((_,e)=>{const v=existing(e).attr('href');if(!v.startsWith('/assets/'))existing(e).attr('href',link(v,page.url));});
 existing('img,source,video,audio,script,link,[data-src],[data-json-url]').each((_,e)=>{for(const key of ['src','poster','data-src','data-json-url','data-poster-url',...(e.tagName==='link'?['href']:[])]){const v=existing(e).attr(key);if(v&&!v.startsWith('data:')&&!['/localize.js','/interactions.js','/navigation.js','/local.css'].includes(v))existing(e).attr(key,localAsset(v,page.url));}const srcset=existing(e).attr('srcset');if(srcset)existing(e).attr('srcset',srcset.split(',').map(item=>{const [url,...size]=item.trim().split(/\s+/);return [localAsset(url,page.url),...size].join(' ');}).join(', '));});
 existing('script[src="/navigation.js"]').remove();existing('body').append('<script src="/navigation.js"></script>');await fs.writeFile(path.join(dist,'index.html'),existing.html());routeFiles['/']='index.html';return;}
 $('script').each((_,el)=>{
  const src=$(el).attr('src'),type=$(el).attr('type')||'';
  if(sdkPage){if(src){if(assetMap.has(new URL(src,page.url).href))$(el).attr('src',localAsset(src,page.url));else $(el).remove();}else if(/gtag|dataLayer/.test($(el).html()||''))$(el).remove();return;}
  if(type==='application/ld+json'||type==='application/json')return;
  if(src&&/(?:jquery[-.]|\/js\/[^/]*\.(?:schunk\.|[\da-f]{4}))[\s\S]*\.js/.test(src)&&assetMap.has(new URL(src,page.url).href)){$(el).attr('src',localAsset(src,page.url));return;}
  if(!src&&/w-mod-|menu-button/.test($(el).html()||''))return;
  $(el).remove();
 });
 $('noscript,base,meta[http-equiv="refresh"]').remove();$('link[rel="canonical"],link[rel="preconnect"],link[rel="dns-prefetch"],link[rel="alternate"]').remove();
 $('[integrity],[crossorigin],[nonce]').removeAttr('integrity crossorigin nonce');
 $('a[href]').each((_,el)=>$(el).attr('href',link($(el).attr('href'),page.url)));
 $('img,source,video,audio,script,link,object,[data-src],[data-json-url],[data-poster-url],[data-video-urls]').each((_,el)=>{
  for(const key of ['src','poster','data-src','data-json-url','data-poster-url','data']){const value=$(el).attr(key);if(value&&!/^(?:data:|#)/.test(value))$(el).attr(key,localAsset(value,page.url));}
  if(el.tagName==='link'){const href=$(el).attr('href');if(href)$(el).attr('href',localAsset(href,page.url));}
  const srcset=$(el).attr('srcset');if(srcset)$(el).attr('srcset',srcset.split(',').map(entry=>{const [url,...size]=entry.trim().split(/\s+/);return [localAsset(url,page.url),...size].join(' ');}).join(', '));
  const videoUrls=$(el).attr('data-video-urls');if(videoUrls)$(el).attr('data-video-urls',videoUrls.split(',').map(url=>localAsset(url,page.url)).join(','));
 });
 $('style').each((_,el)=>$(el).html(css($(el).html()||'',page.url)));$('[style]').each((_,el)=>$(el).attr('style',css($(el).attr('style'),page.url)));
 $('iframe[src]').each((_,el)=>{const src=$(el).attr('src');if(/google.*tag|doubleclick|challenge-platform/.test(src))$(el).remove();else $(el).attr('src',new URL(src,page.url).href);});
 // Keep public forms on their original service; no local form collects or stores data.
 $('form').each((_,el)=>{const action=$(el).attr('action');if(action)$(el).attr('action',new URL(action,page.url).href);});
 $('head').append('<link rel="stylesheet" href="/local.css"><script src="/localize.js"></script>');
 $('body').append('<script src="/interactions.js"></script><script src="/navigation.js"></script>');
 const u=new URL(page.url),key=localRoute(page.url);
 const file='_pages/'+path.basename(page.file);
 const dest=path.join(dist,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,$.html());routeFiles[key]=file;
}));if(pi%120===0)console.log(`Rendered ${Math.min(pi+6,successful.length)}/${successful.length} pages`);}
for(const page of state.pages.filter(p=>p.status==='external')){if(routes.has(page.redirect)){const alias=new URL(page.url);routeFiles[alias.pathname+alias.search]=routeFiles[routes.get(page.redirect)];}}
for(const asset of state.assets.filter(a=>a.status==='downloaded'&&a.url.startsWith('https://discord.com/developers/docs/social-sdk/'))){const u=new URL(asset.url);routeFiles[u.pathname+u.search]=asset.file;}
await fs.writeFile(path.join(dist,'route-map.json'),JSON.stringify(routeFiles,null,2));
await fs.writeFile(path.join(dist,'page-routes.js'),'window.BISCORD_ROUTES='+JSON.stringify(Object.fromEntries(routes))+';');
await fs.copyFile(path.join(root,'navigation.js'),path.join(dist,'navigation.js'));
for(const file of ['local.css','localize.js','interactions.js'])await fs.copyFile(path.join(root,file),path.join(dist,file));
const escape=s=>String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
await fs.mkdir(path.join(dist,'__archive'),{recursive:true});
const failed=state.pages.filter(p=>p.status==='failed');
const index=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Páginas locais — Biscord</title><style>body{max-width:1100px;margin:48px auto;padding:0 24px;background:#0b0c23;color:#eee;font:16px/1.6 system-ui}a{color:#aeb8ff}input{width:100%;box-sizing:border-box;padding:14px;border-radius:8px;font:inherit}li{margin:12px 0}small{color:#bbb}header{margin-bottom:32px}</style><header><a href="/">← Home</a><h1>Páginas locais</h1><p>${successful.length} páginas copiadas. ${failed.length} endereços indisponíveis na origem.</p><input placeholder="Buscar título ou endereço" aria-label="Buscar páginas"></header><ul>${successful.map(p=>{const u=new URL(p.url);return `<li><a href="${escape(localRoute(p.url))}">${escape(p.title||u.pathname)}</a> <small>${escape(localRoute(p.url))}</small></li>`;}).join('')}</ul><script>document.querySelector('input').addEventListener('input',e=>{for(const li of document.querySelectorAll('li'))li.hidden=!li.textContent.toLowerCase().includes(e.target.value.toLowerCase())})</script></html>`;
await fs.writeFile(path.join(dist,'__archive/index.html'),index);
await fs.writeFile(path.join(root,'coverage.json'),JSON.stringify({scope:state.scope,pages:successful.length,failedPages:failed,excludedAppShells:excludedShells.map(p=>p.url),externalRedirects:state.pages.filter(p=>p.status==='external'),assets:state.assets.filter(a=>a.status==='downloaded').length,failedAssets:state.assets.filter(a=>a.status==='failed'),updatedAt:state.updatedAt},null,2));
console.log(JSON.stringify({rendered:successful.length,copiedAssets:copied,failed:failed.length}));
await import('./build-auth.mjs');
