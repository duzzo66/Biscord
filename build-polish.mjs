// JavaScript / build-polish.mjs / Node.js 24+ / idempotent site-wide enhancement build
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),dist=path.join(root,'dist');
for(const name of ['polish.css','polish.js'])await fs.copyFile(path.join(root,name),path.join(dist,name));
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){if(!['assets','node_modules'].includes(entry.name))await walk(file);continue;}if(!entry.name.endsWith('.html'))continue;const before=await fs.readFile(file,'utf8');let html=before;if(!html.includes('href="/polish.css"'))html=html.includes('</head>')?html.replace('</head>','<link rel="stylesheet" href="/polish.css"></head>'):'<link rel="stylesheet" href="/polish.css">'+html;if(!html.includes('src="/polish.js"'))html=html.includes('</body>')?html.replace('</body>','<script src="/polish.js" defer></script></body>'):html+'<script src="/polish.js" defer></script>';if(html!==before)await fs.writeFile(file,html);}}
await walk(dist);
console.log('Shared motion: public pages, authentication and client');
await import('./build-brand.mjs');
