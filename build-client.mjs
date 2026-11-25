// JavaScript / build-client.mjs / Node.js 22+ / local workspace build
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),dist=path.join(root,'dist');
const manifest=JSON.parse((await fs.readFile(path.join(root,'manifest.json'),'utf8')).replace(/^\uFEFF/,''));
const find=name=>manifest.assets.find(a=>a.status==='downloaded'&&a.url.endsWith(name));
const fonts=[find('ggsans-Normal.woff2'),find('ggsans-Medium.woff2'),find('ggsans-Semibold.woff2'),find('ggsans-Bold.woff2')];
const art=find('662630272724e61320fb7ee2_WUMPUS.webp');
if(fonts.some(a=>!a)||!art)throw Error('Required client assets are missing');
const local=file=>'/'+file.split(/[\\/]/).map(encodeURIComponent).join('/');
await fs.mkdir(path.join(dist,'client'),{recursive:true});
for(const asset of [...fonts,art]){await fs.mkdir(path.dirname(path.join(dist,asset.file)),{recursive:true});await fs.copyFile(path.join(root,asset.file),path.join(dist,asset.file));}
const logoSource=await fs.readFile(path.join(root,'auth/assets/131c318dd45b7aa4.svg'),'utf8');
const logoPath=logoSource.match(/<path\b[^>]*\bd="([^"]+)"/)?.[1];if(!logoPath)throw Error('Vulpi reference logo path is missing');
await fs.cp(path.join(root,'client/assets'),path.join(dist,'client/assets'),{recursive:true});
const iconCatalog=JSON.parse(await fs.readFile(path.join(root,'client/assets/icons.json'),'utf8'));
iconCatalog.discord=(await fs.readFile(path.join(root,'branding/assets/fox-mark.svg'),'utf8')).replace('<svg ','<svg aria-hidden="true" ');
const originalIcons=JSON.stringify(iconCatalog);
const cosmetics=JSON.parse(await fs.readFile(path.join(root,'client/assets/collectibles/catalog.json'),'utf8'));
const badges=JSON.parse(await fs.readFile(path.join(root,'client/assets/badges/catalog.json'),'utf8'));
const themes=JSON.parse(await fs.readFile(path.join(root,'client/assets/themes/catalog.json'),'utf8'));
for(const file of ['call-stage.js','call-stage.css','server-call.js','desktop-proportions.css','custom-status.js','custom-status.css','loading.js','loading.css','responsive.css','scrollbars.css','calls.js','calls.css','full-profile.js','full-profile.css','profile-contrast.js','profile-contrast.css','server-connect.js','server-connect.css'])await fs.copyFile(path.join(root,'client',file),path.join(dist,'client',file));
const substitutions={'__THEME_CATALOG__':JSON.stringify(themes.items),'__BADGE_CATALOG__':JSON.stringify(badges.items),'__COSMETICS_CATALOG__':JSON.stringify(cosmetics.items),'__ORIGINAL_ICONS__':originalIcons,'__FONT__':local(fonts[0].file),'__FONT_MEDIUM__':local(fonts[1].file),'__FONT_SEMI__':local(fonts[2].file),'__FONT_BOLD__':local(fonts[3].file),'__EMPTY_ART__':local(art.file),'__DISCORD_MARK__':logoPath};
for(const file of ['server-boosts.js','server-boosts.css','server-settings.js','server-settings.css','voice.css','themes.js','themes.css','badges.js','badges.css','cosmetics.js','cosmetics.css','index.html','style.css','client.js','api.js','sounds.js','settings.js','settings.css','profile-editor.js','profile-editor.css','profile-layout.js','profile-full.css']){let text=await fs.readFile(path.join(root,'client',file),'utf8');for(const [key,value] of Object.entries(substitutions))text=text.replaceAll(key,value);await fs.writeFile(path.join(dist,'client',file),text);}
let routes={};try{routes=JSON.parse(await fs.readFile(path.join(dist,'route-map.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const route of ['/app','/channels','/channels/@me'])routes[route]='client/index.html';
await fs.writeFile(path.join(dist,'route-map.json'),JSON.stringify(routes,null,2));
console.log('Workspace: /channels/@me');

await import('./build-polish.mjs');
