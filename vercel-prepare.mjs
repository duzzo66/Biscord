// JavaScript / vercel-prepare.mjs / Node 24 / isolated cloud source, no credentials
import fs from 'node:fs';import path from 'node:path';
import {externalApiOrigin,vercelConfig} from './deployment-config.mjs';
const apiOrigin=externalApiOrigin(process.env.BISCORD_API_ORIGIN||'');
const out=apiOrigin?'.vercel-stage-local':'.vercel-stage';fs.mkdirSync(out,{recursive:true});const copy=(a,b)=>{fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(a,b);};
if(!apiOrigin)for(const f of ['server-voice.mjs','backend.mjs','database.mjs','server-memberships.mjs','cloud-realtime.mjs','boost-policy.mjs','badge-policy.mjs','message-history.mjs','realtime-auth.mjs','performance-metrics.mjs'])copy(f,out+'/'+f);
if(!apiOrigin){fs.cpSync('api',out+'/api',{recursive:true});fs.cpSync('certs',out+'/certs',{recursive:true});}
else copy('api/media.mjs',out+'/api/media.mjs');
if(!apiOrigin)for(const f of ['client/assets/themes/catalog.json','client/assets/badges/catalog.json','client/assets/collectibles/catalog.json'])copy(f,out+'/'+f);
const skip=['assets','downloads'];for(const e of fs.readdirSync('dist',{withFileTypes:true})){if(skip.includes(e.name))continue;fs.cpSync('dist/'+e.name,out+'/public/'+e.name,{recursive:true,filter:p=>!p.replaceAll('\\','/').includes('/collectibles/media/')&&!p.replaceAll('\\','/').endsWith('/collectibles/media')});}
for(const x of JSON.parse(fs.readFileSync('branding/overrides.json','utf8')))copy('branding/overrides/'+x.file,out+'/public/'+x.file);
for(const name of ['Vulpi-Android.apk','Biscord-Android.apk'])if(fs.existsSync('dist/downloads/'+name))copy('dist/downloads/'+name,out+'/public/downloads/'+name);
const map={};const add=(file,url)=>{if(file&&url&&/^https:\/\//.test(url)){map['/'+file.replace(/^\//,'')]=url;map['/'+file.replace(/^\//,'').split(/[\\/]/).map(encodeURIComponent).join('/')]=url;}};
const cache=JSON.parse(fs.readFileSync('asset-cache.json','utf8'));for(const a of (Array.isArray(cache)?cache:cache.assets||cache.items||[]))add(a.file,a.url);
for(const a of JSON.parse(fs.readFileSync('manifest.json','utf8').replace(/^\uFEFF/,'' )).assets)add(a.file,a.url);
for(const a of JSON.parse(fs.readFileSync('client/assets/collectibles/downloads.json','utf8')))add(a.local,a.url);
fs.writeFileSync(out+'/media-map.json',JSON.stringify(map));
const routeMap=JSON.parse(fs.readFileSync('dist/route-map.json','utf8'));
fs.writeFileSync(out+'/vercel.json',JSON.stringify(vercelConfig(routeMap,apiOrigin),null,2));
const project=JSON.parse(fs.readFileSync('package.json','utf8'));
fs.writeFileSync(out+'/package.json',JSON.stringify({name:'biscord-cloud',version:project.version,private:true,type:'module',engines:{node:'24.x'},dependencies:apiOrigin?{}:project.dependencies},null,2));
console.log(apiOrigin?'Frontend Vercel -> '+apiOrigin+'; saida '+out:'API em Vercel Functions; saida '+out);
console.log('Cloud package prepared with '+Object.keys(map).length+' catalog paths; credentials excluded.');
