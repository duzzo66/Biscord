// JavaScript / restore-assets.mjs / Node.js 24 / reproducible public asset cache
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
const index=JSON.parse(await fs.readFile(path.join(root,'asset-cache.json'),'utf8'));
const verify=process.argv.includes('--verify'),check=process.argv.includes('--check');
const concurrency=Number(process.env.BISCORD_ASSET_CONCURRENCY||6);
if(!Number.isInteger(concurrency)||concurrency<1||concurrency>64)throw Error('BISCORD_ASSET_CONCURRENCY must be an integer between 1 and 64');
let cursor=0,present=0,restored=0,failed=[];
async function valid(item,file){try{const stat=await fs.stat(file);if(stat.size!==item.bytes)return false;if(verify&&item.sha256){const hash=createHash('sha256').update(await fs.readFile(file)).digest('hex');return hash===item.sha256;}return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
await Promise.all(Array.from({length:concurrency},async()=>{for(;;){const item=index.assets[cursor++];if(!item)return;
 const file=path.resolve(root,item.file);
 if(!file.startsWith(root+path.sep))throw Error('Asset path outside repository');
 if(await valid(item,file)){present++;continue;}
 if(check){failed.push(item.file);continue;}
 let error;for(let attempt=0;attempt<3;attempt++){let temporary;
  try{const url=new URL(item.url);if(!['https:','http:'].includes(url.protocol))throw Error('Invalid asset URL');const response=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!response.ok)throw Error('HTTP '+response.status);const bytes=Buffer.from(await response.arrayBuffer());if(item.bytes&&bytes.length!==item.bytes)throw Error('Unexpected asset size');if(item.sha256&&createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Checksum mismatch');await fs.mkdir(path.dirname(file),{recursive:true});temporary=file+'.download';await fs.writeFile(temporary,bytes);await fs.rename(temporary,file);restored++;error=null;break;
  }catch(e){error=e;}
 }if(error)failed.push(item.file+': '+error.message);
 if((present+restored+failed.length)%100===0)console.log(`${present+restored+failed.length}/${index.assets.length} assets checked`);
}}));
console.log(JSON.stringify({present,restored,failed:failed.length,total:index.assets.length}));
if(failed.length){for(const item of failed.slice(0,20))console.error(item);process.exitCode=1;}
