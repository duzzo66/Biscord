// JavaScript / inventory.mjs / Node.js 22+ / public navigation inventory
import fs from 'node:fs/promises';
import {load} from 'cheerio';
const html=await fs.readFile(new URL('./index.original.html',import.meta.url),'utf8');
const $=load(html),pages=new Map(),external=new Map();
$('a[href]').each((_,el)=>{
 const raw=$(el).attr('href');try{
  const url=new URL(raw,'https://discord.com/');
  if(!['https:','http:'].includes(url.protocol)||url.pathname==='/')return;
  url.hash='';
  const item={url:url.href,label:$(el).text().replace(/\s+/g,' ').trim(),path:url.pathname};
  if(url.hostname==='discord.com'&&!/^\/(?:api|assets|w)\//.test(url.pathname))pages.set(url.pathname,item);
  else external.set(url.href,item);
 }catch{}
});
const result={pages:[...pages.values()],external:[...external.values()]};
await fs.writeFile(new URL('./page-inventory.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
