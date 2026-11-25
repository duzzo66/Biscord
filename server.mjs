// JavaScript / server.mjs / Node.js 22+ / localhost static preview
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createBackend} from './backend.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const backend=createBackend({dataDir:process.env.BISCORD_DATA_DIR||path.join(path.dirname(root),'data'),secure:process.env.COOKIE_SECURE==='true',databaseUrl:process.env.DATABASE_URL||'',projectRef:process.env.SUPABASE_PROJECT_REF||'',publicOrigin:process.env.PUBLIC_ORIGIN||'',localOrigin:process.env.LOCAL_ORIGIN||'',sslRootCert:process.env.PGSSLROOTCERT||''});
try{await backend.ready;}catch(error){console.error('Falha ao inicializar o banco:',error.code||error.name);await backend.close();process.exit(1);}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.ogg':'audio/ogg','.lottie':'application/zip'};
let routeCache={modified:0,routes:{}};
Object.assign(types,{'.pdf':'application/pdf','.txt':'text/plain; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.otf':'font/otf','.webmanifest':'application/manifest+json'});
const server=http.createServer(async(req,res)=>{
 try{
  if(await backend.handle(req,res))return;
  if(req.url==='/healthz'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({ok:true,storage:backend.storage}));return;}
  if(process.env.BISCORD_API_ONLY==='true'){res.writeHead(404).end('Not found');return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const requested=new URL(req.url,'http://localhost');
  const normalized=pathname.replace(/\/+$/,'')||'/';
  const encoded=requested.pathname.replace(/\/+$/,'')||'/';
  let route;
  if(!/^\/(?:assets\/|_pages\/)/.test(pathname))try{const mapFile=path.join(root,'route-map.json'),modified=fs.statSync(mapFile).mtimeMs;if(modified!==routeCache.modified)routeCache={modified,routes:JSON.parse(fs.readFileSync(mapFile,'utf8'))};route=routeCache.routes[encoded+requested.search]||routeCache.routes[normalized+requested.search]||routeCache.routes[encoded]||routeCache.routes[normalized];}catch{}
  if(normalized.startsWith('/invite/')||normalized==='/app'||normalized==='/channels'||normalized.startsWith('/channels/'))route='client/index.html';
  if(normalized==='/reset-password')route='auth/index.html';
  let file=route?path.resolve(root,route):path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end('Not found');return;}
  const size=fs.statSync(file).size;
  const headers={'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN'};
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  let start=0,end=size-1,status=200;
  if(range){start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),size-1):size-1;if(start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;}
  headers['Content-Length']=end-start+1;res.writeHead(status,headers);
  if(req.method==='HEAD'){res.end();return;}
  fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
 }catch{res.writeHead(400).end('Bad request');}
});
const port=Number(process.env.PORT||4173);
server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
process.on('SIGTERM',async()=>{await backend.close();server.close(()=>process.exit());});
