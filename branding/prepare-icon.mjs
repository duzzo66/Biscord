// JavaScript / branding/prepare-icon.mjs / Node 24 / native fox application icon export
import fs from 'node:fs';
import {Resvg} from '@resvg/resvg-js';
const source=new URL('./assets/',import.meta.url);
const mark=fs.readFileSync(new URL('fox-mark.svg',source),'utf8').replace(/<svg[^>]*>|<\/svg>/g,'').replaceAll('currentColor','#fff');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="-3 -3 38 38"><rect x="-3" y="-3" width="38" height="38" rx="9" fill="#5865f2"/>${mark}</svg>`;
const png=new Resvg(svg).render().asPng(),header=Buffer.alloc(22);
header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);
fs.writeFileSync(new URL('vulcord-icon.png',source),png);
fs.writeFileSync(new URL('vulcord.ico',source),Buffer.concat([header,png]));
