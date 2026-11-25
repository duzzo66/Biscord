// JavaScript / build-brand.mjs / Node.js 24 / persistent Vulpi branding build
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {brandHTML} from './branding/brand-html.mjs';
import {Resvg} from '@resvg/resvg-js';
const root=path.dirname(fileURLToPath(import.meta.url)),dist=path.join(root,'dist'),brand=path.join(root,'branding');
const readJSON=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
await fs.mkdir(path.join(dist,'brand'),{recursive:true});
await fs.cp(path.join(brand,'assets'),path.join(dist,'brand'),{recursive:true});
await fs.copyFile(path.join(brand,'branding.js'),path.join(dist,'brand/branding.js'));
const mark=await fs.readFile(path.join(brand,'assets/fox-mark.svg'),'utf8');
await fs.writeFile(path.join(dist,'brand/fox-mark-white.svg'),mark.replace('fill="currentColor"','fill="#fff"'));
const logo=`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="36" viewBox="0 0 160 36"><g color="#fff" transform="translate(0 2)">${mark.replace(/<svg[^>]*>|<\/svg>/g,'')}</g><text x="41" y="27" font-family="Segoe UI,Arial,sans-serif" font-weight="800" font-size="27" letter-spacing="-.8" fill="#fff">Vulpi</text></svg>`;
const wordmark=await fs.readFile(path.join(brand,'assets/vulpi-wordmark.svg'),'utf8');
await fs.writeFile(path.join(dist,'brand/vulpi-wordmark.svg'),wordmark);
await fs.writeFile(path.join(dist,'brand/vulpi-wordmark.png'),new Resvg(wordmark).render().asPng());
await fs.writeFile(path.join(dist,'brand/vulpi-logo.svg'),logo);
await fs.writeFile(path.join(dist,'brand/favicon.svg'),mark.replace('<path ','<rect width="32" height="32" rx="8" fill="#5865f2"/><path ').replace('fill="currentColor"','fill="white"').replace('viewBox="0 0 32 32"','viewBox="-3 -3 38 38"'));
for(const file of ['auth/assets/131c318dd45b7aa4.svg','auth/assets/bbbc3d376d38e7bc.svg'])await fs.writeFile(path.join(dist,file),logo);
const foxData=await fs.readFile(path.join(brand,'assets/fox-party.png'),'base64');
const authBackground=`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="g"><stop stop-color="#7970ed"/><stop offset="1" stop-color="#261568"/></radialGradient></defs><rect width="1440" height="900" fill="url(#g)"/><g fill="none" stroke="#a49afc" opacity=".15"><ellipse cx="720" cy="450" rx="870" ry="340" stroke-width="85" transform="rotate(-24 720 450)"/><circle cx="50" cy="70" r="240" stroke-width="2"/><circle cx="1400" cy="780" r="300" stroke-width="2"/></g><image href="data:image/png;base64,${foxData}" x="-30" y="580" width="300" height="300"/><g transform="translate(1440 0) scale(-1 1)"><image href="data:image/png;base64,${foxData}" x="-20" y="60" width="250" height="250" opacity=".9"/></g></svg>`;
await fs.writeFile(path.join(dist,'auth/assets/d8680b1c1576ecc8.svg'),authBackground);
const manifests=await Promise.all(['manifest.json','mirror-manifest.json'].map(f=>readJSON(path.join(root,f))));
let logoCount=0;
for(const asset of new Map(manifests.flatMap(m=>m.assets).map(a=>[a.file,a])).values()){
 const name=decodeURIComponent(asset.url||'').split('/').pop()||'';
 const alternateLogo=/^(?:67ed8194f41d7d8eade32c90|67ece93be2524af5cf14dc1c|67d00cf7266d2c75571aebde)_/.test(name);
 if(!alternateLogo&&!/(?:discord[^/]*(?:logo|mark)|discrod.*logo|(?:logo|mark)[^/]*discord|_Wordmark|_Symbol)\.(?:svg|png|webp)$/i.test(name))continue;
 const target=path.join(dist,asset.file);try{await fs.access(target);}catch{continue;}
 // SVG wordmarks and symbols retain their existing URLs and layout boxes.
 if(name.endsWith('.svg')){let svg=/wordmark/i.test(name)?wordmark:/symbol/i.test(name)?mark.replace('fill="currentColor"','fill="#fff"'):logo;if(name.startsWith('67ed8194'))svg=svg.replaceAll('#fff','#16161b');await fs.writeFile(target,svg);logoCount++;}
}
const overrides=await readJSON(path.join(brand,'overrides.json'));
for(const {file} of overrides){const target=path.join(dist,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(brand,'overrides',file),target);}
// Public and authentication pages share the brand and mascot after every build.
let pages=0;
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(['assets','brand','node_modules'].includes(entry.name))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(entry.name.endsWith('.html')){const before=await fs.readFile(file,'utf8');const after=brandHTML(before);if(after!==before)await fs.writeFile(file,after);pages++;}}}
await walk(dist);
await fs.writeFile(path.join(dist,'brand/manifest.json'),JSON.stringify({brand:'Vulpi',mascot:'Raposa',pages,logoCount,overrides},null,2));
console.log(`Vulpi branding: ${pages} pages, ${logoCount+2} logos, ${overrides.length} mascot files`);
