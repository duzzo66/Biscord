// JavaScript / verify-site.mjs / Node.js 22+ / archive route and asset integrity
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from 'cheerio';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const routes=JSON.parse(await fs.readFile(path.join(root,'route-map.json'),'utf8'));
const problems=[],resources=new Set(),externalResources=new Set(),links=new Set();
let checkedPages=0;
for(const [route,file] of Object.entries(routes)){
 if(!file.endsWith('.html'))continue;
 let html;try{html=await fs.readFile(path.join(root,file),'utf8');}catch{problems.push({route,file,error:'Missing page file'});continue;}
 const $=load(html);checkedPages++;
 if(!$('title').text().trim())problems.push({route,error:'Missing page title'});
 $('img,source,video,audio,script,link').each((_,el)=>{
  const node=$(el);for(const key of ['src','poster',...(el.tagName==='link'?['href']:[])]){const value=node.attr(key);if(value?.startsWith('/'))resources.add(value);else if(value?.startsWith('https:'))externalResources.add(value);}
  for(const entry of (node.attr('srcset')||'').split(',')){const value=entry.trim().split(/\s+/)[0];if(value?.startsWith('/'))resources.add(value);else if(value?.startsWith('https:'))externalResources.add(value);}
 });
 $('a[href]').each((_,el)=>{const href=$(el).attr('href');if(href.startsWith('/')&&!href.startsWith('//'))links.add(href.split('#')[0]);});
 if(checkedPages%100===0)console.log(`Verified ${checkedPages} page routes`);
}
for(const url of resources){try{await fs.access(path.join(root,decodeURIComponent(url.split('?')[0])));}catch{problems.push({resource:url,error:'Missing local resource'});}}
for(const url of links){if(!url||routes[url])continue;try{await fs.access(path.join(root,decodeURIComponent(url.split('?')[0])));}catch{problems.push({link:url,error:'Missing local route'});}}
const report={checkedPages,uniqueResources:resources.size,uniqueLocalLinks:links.size,externalResources:[...externalResources],problems,verifiedAt:new Date().toISOString()};
await fs.writeFile(path.join(root,'verification-site.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checkedPages,resources:resources.size,problems:problems.length,externalResources:externalResources.size}));if(problems.length)process.exitCode=1;
