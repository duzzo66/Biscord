// JavaScript / sync.mjs / Node.js 22+ / resume the public content archive
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
async function run(file,args=[]){await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[file,...args],{cwd:root,stdio:'inherit'});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`${file}: exit ${code}`)));});}
await run('inventory.mjs');await run('mirror.mjs',process.argv.includes('--retry')?['--retry']:[]);await run('mirror.mjs',['--docs',...(process.argv.includes('--retry')?['--retry']:[])]);
try{await fs.access(path.join(root,'captures/manifest.json'));await run('mirror.mjs',['--captures']);}catch(e){if(e.code!=='ENOENT')throw e;}
await run('mirror.mjs',['--sdk']);await run('mirror.mjs');await run('render-mirror.mjs');await run('verify-site.mjs');
