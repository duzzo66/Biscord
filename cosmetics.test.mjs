// JavaScript / cosmetics.test.mjs / Node.js 24 / local cosmetic catalog integrity
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const catalog=JSON.parse(fs.readFileSync('client/assets/collectibles/catalog.json','utf8'));
test('catalog asset references stay local and every referenced file exists',()=>{
 const ids=new Set();for(const x of catalog.items){assert.ok(!ids.has(x.id));ids.add(x.id);assert.ok(['decoration','effect','frame','nameplate'].includes(x.kind));assert.match(x.id,/^\d+$/);const urls=[x.thumbnail,x.animated,...Object.values(x.layers),...x.effects.flatMap(e=>[e.src,...e.randomizedSources.map(r=>r.src)])].filter(Boolean);assert.ok(urls.length);for(const url of urls){assert.match(url,/^\/client\/assets\/collectibles\/media\/[a-f\d]+\.(png|webp|gif|jpg|webm|mp4)$/);assert.ok(fs.statSync('.'+url).size>0,url);}}
});

test('nameplates use local static and animated assets and respect reduced motion',()=>{
 const window={BiscordAPI:{session:{preferences:{reduceMotion:false}}}},document={addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('client/cosmetics.js','utf8').replace('__COSMETICS_CATALOG__',JSON.stringify(catalog.items)),{window,document,Map,console});
 const c=window.BiscordCosmetics,plates=catalog.items.filter(x=>x.kind==='nameplate');assert.ok(plates.length>=324);
 for(const x of plates){assert.ok(x.thumbnail);assert.ok(x.animated);assert.match(c.nameplate(x.id),/<video[^>]+autoplay muted loop playsinline/);}
 assert.equal(c.nameplate('invalid'),'');assert.equal(c.nameplate(catalog.items.find(x=>x.kind==='frame').id),'');
 window.BiscordAPI.session.preferences.reduceMotion=true;const html=c.nameplate(plates[0].id);assert.doesNotMatch(html,/<video/);assert.ok(html.includes(plates[0].thumbnail));
});
test('cosmetics render escaped markup and only accept the matching item type',()=>{
 const window={},document={addEventListener(){}};const code=fs.readFileSync('client/cosmetics.js','utf8').replace('__COSMETICS_CATALOG__',JSON.stringify(catalog.items));vm.runInNewContext(code,{window,document,Map,console});const c=window.BiscordCosmetics;const decoration=catalog.items.find(x=>x.kind==='decoration'),effect=catalog.items.find(x=>x.kind==='effect'),frame=catalog.items.find(x=>x.kind==='frame');assert.match(c.decoration(decoration.id),/bc-avatar-decoration/);assert.equal(c.decoration(frame.id),'');assert.equal(c.get('frame',decoration.id),null);assert.match(c.layers({effectId:effect.id,frameId:frame.id}),/bc-profile-frame/);assert.equal(c.layers({effectId:'invalid',frameId:'invalid'}),'');assert.equal(c.esc('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');
});

test('effect playback schedules layers, loops and cancels timers when the profile closes',()=>{
 const item=catalog.items.find(x=>x.kind==='effect'&&x.effects.some(e=>e.loop));let nextId=0;const timers=new Map(),appended=[];const node={isConnected:true,dataset:{cosmeticEffect:item.id},append(img){appended.push(img);}};const document={hidden:false,addEventListener(){},querySelectorAll(){return node.isConnected?[node]:[];},createElement(){return {style:{},remove(){this.removed=true;}};}};
 const window={},sandbox={window,document,Map,Set,Math,console,matchMedia:()=>({matches:false}),setTimeout(fn,delay){const id=++nextId;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);}};
 vm.runInNewContext(fs.readFileSync('client/cosmetics.js','utf8').replace('__COSMETICS_CATALOG__',JSON.stringify([item])),sandbox);window.BiscordCosmetics.sync();assert.equal(timers.size,item.effects.length);const initial=[...timers.entries()];for(const [id,{fn}] of initial){timers.delete(id);fn();}assert.equal(appended.length,item.effects.length);assert.ok(appended.every(img=>img.src.startsWith('/client/')));node.isConnected=false;window.BiscordCosmetics.sync();assert.equal(timers.size,0);
});
