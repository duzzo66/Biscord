// JavaScript / vercel-env.mjs / Node 24 / private environment upload over CLI stdin
import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const values={DATABASE_URL:process.env.DATABASE_URL,SUPABASE_PROJECT_REF:process.env.SUPABASE_PROJECT_REF,BISCORD_ENCRYPTION_KEY:fs.readFileSync('data/encryption.key').toString('base64'),BISCORD_CLOUD:'true'};
for(const [key,value]of Object.entries(values)){if(!value)throw Error('Missing '+key);const result=spawnSync('cmd.exe',['/d','/s','/c',`npx --yes vercel env add ${key} production`],{cwd:'.vercel-stage',input:value,encoding:'utf8',windowsHide:true,timeout:120000});if(result.status!==0){console.error('Failed to set '+key);process.exit(1);}console.log(key+': configured');}
