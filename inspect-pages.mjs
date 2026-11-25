// JavaScript / inspect-pages.mjs / Node.js 22+ / inspect captured public page controls
import fs from 'node:fs';
import {load} from 'cheerio';
for(const [file,url] of [['docs-manifest.json','https://docs.discord.com/developers/intro'],['captures-manifest.json','https://discord.com/application-directory']]){
 const manifest=JSON.parse(fs.readFileSync(file));const page=manifest.pages.find(p=>p.url===url);const $=load(fs.readFileSync(page.file));
 console.log(url);console.log(JSON.stringify({buttons:$('button').map((_,el)=>({text:$(el).text().slice(0,80),label:$(el).attr('aria-label'),controls:$(el).attr('aria-controls'),class:$(el).attr('class')?.slice(0,100)})).get().slice(0,25),inputs:$('input').map((_,el)=>el.attribs).get()},null,2));
}
