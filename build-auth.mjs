// JavaScript / build-auth.mjs / Node.js 22+ / build local authentication screens
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import QRCode from 'qrcode';
const root=path.dirname(fileURLToPath(import.meta.url)),dist=path.join(root,'dist');
const manifest=JSON.parse((await fs.readFile(path.join(root,'manifest.json'),'utf8')).replace(/^\uFEFF/,''));
const url=file=>'/'+file.split(/[\\/]/).map(encodeURIComponent).join('/');
const font=manifest.assets.find(a=>a.status==='downloaded'&&/ggsans-Normal\.woff2/.test(a.url))||manifest.assets.find(a=>a.status==='downloaded'&&/ABCGintoDiscord-Regular\.woff2/.test(a.url));
const bold=manifest.assets.find(a=>a.status==='downloaded'&&/ggsans-Bold\.woff2/.test(a.url))||manifest.assets.find(a=>a.status==='downloaded'&&/ggsans-ExtraBold\.woff2/.test(a.url))||font;
const medium=manifest.assets.find(a=>a.status==='downloaded'&&/ggsans-Medium\.woff2/.test(a.url))||font;
const semi=manifest.assets.find(a=>a.status==='downloaded'&&/ggsans-Semibold\.woff2/.test(a.url))||bold;
if(!font)throw Error('Required authentication screen font is missing');
await fs.mkdir(path.join(dist,'auth'),{recursive:true});
await fs.mkdir(path.join(root,'auth/assets'),{recursive:true});
await fs.writeFile(path.join(root,'auth/assets/preview-qr.svg'),await QRCode.toString('vulcord: PREVIA LOCAL SEM AUTENTICACAO',{type:'svg',width:160,margin:0,errorCorrectionLevel:'H',color:{dark:'#000000',light:'#ffffff'}}));
await fs.cp(path.join(root,'auth/assets'),path.join(dist,'auth/assets'),{recursive:true});
for(const asset of [font,medium,semi,bold]){await fs.mkdir(path.dirname(path.join(dist,asset.file)),{recursive:true});await fs.copyFile(path.join(root,asset.file),path.join(dist,asset.file));}
for(const file of ['index.html','style.css','auth.js']){let text=await fs.readFile(path.join(root,'auth',file),'utf8');text=text.replaceAll('__FONT__',url(font.file)).replaceAll('__FONT_MEDIUM__',url(medium.file)).replaceAll('__FONT_SEMI__',url(semi.file)).replaceAll('__FONT_BOLD__',url(bold.file));await fs.writeFile(path.join(dist,'auth',file),text);}
for(const file of ['local-terms.html','local-privacy.html'])await fs.copyFile(path.join(root,'auth',file),path.join(dist,file));
let routes={};try{routes=JSON.parse(await fs.readFile(path.join(dist,'route-map.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const route of ['/login','/register','/cadastro','/forgot-password','/recuperar-senha','/reset-password'])routes[route]='auth/index.html';
await fs.writeFile(path.join(dist,'route-map.json'),JSON.stringify(routes,null,2));
await fs.copyFile(path.join(root,'navigation.js'),path.join(dist,'navigation.js'));
console.log('Authentication screens: /login, /register, /forgot-password');
await import('./build-client.mjs');
