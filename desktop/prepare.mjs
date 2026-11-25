// JavaScript / desktop/prepare.mjs / Node 24 / public desktop server configuration
import fs from 'node:fs';
const url=new URL(process.env.BISCORD_DESKTOP_URL||process.env.PUBLIC_ORIGIN||'https://biscord-ashy.vercel.app');
if(url.username||url.password)throw Error('A URL pública não pode conter credenciais.');
fs.writeFileSync(new URL('./server.json',import.meta.url),JSON.stringify({url:url.origin})+'\n');
console.log('Servidor público do aplicativo configurado.');
