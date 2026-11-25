// JavaScript / capture-server.mjs / Node.js 22+ / local rendered-page capture
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Captura local</title><body><h1>Salvar página renderizada</h1><form method="POST"><label>URL original<input name="url" aria-label="URL original" required></label><label>HTML<textarea name="html" aria-label="HTML" rows="12" cols="80" required></textarea></label><button>Salvar captura</button></form></body></html>';
http.createServer(async(req,res)=>{
 if(req.method!=='POST'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;}
 try{let body='';for await(const part of req){body+=part;if(body.length>25000000)throw Error('Too large');}const form=new URLSearchParams(body);const url=new URL(form.get('url'));if(!['discord.com','docs.discord.com'].includes(url.hostname))throw Error('Invalid source');const content=form.get('html');if(!content?.includes('<html'))throw Error('Invalid HTML');const file='captures/'+crypto.createHash('sha256').update(url.href).digest('hex')+'.html';await fs.mkdir(path.join(root,'captures'),{recursive:true});await fs.writeFile(path.join(root,file),content);let manifest=[];try{manifest=JSON.parse(await fs.readFile(path.join(root,'captures/manifest.json'),'utf8'));}catch{}manifest=manifest.filter(p=>p.url!==url.href);manifest.push({url:url.href,file,capturedAt:new Date().toISOString()});await fs.writeFile(path.join(root,'captures/manifest.json'),JSON.stringify(manifest,null,2));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end('<h1>Captura salva</h1><p>'+url.href+'</p>');}catch(e){res.writeHead(400).end(e.message);}
}).listen(4174,'127.0.0.1',()=>console.log('Capture: http://127.0.0.1:4174'));
