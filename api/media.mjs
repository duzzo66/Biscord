// JavaScript / api/media.mjs / Vercel / fixed catalog asset redirects
import fs from 'node:fs';
const media=JSON.parse(fs.readFileSync(new URL('../media-map.json',import.meta.url),'utf8'));
export default function handler(req,res){let path=Array.isArray(req.query.path)?req.query.path.join('/'):req.query.path||'';if(!path.startsWith('/'))path='/'+path;let url=media[path];if(!url)try{url=media[decodeURIComponent(path)];}catch{}if(!url){res.statusCode=404;res.end();return;}res.writeHead(307,{Location:url,'Cache-Control':'public, max-age=86400'});res.end();}
