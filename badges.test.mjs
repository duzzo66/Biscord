// JavaScript / badges.test.mjs / Node.js 24 / profile badge catalog and editor
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const catalog=JSON.parse(fs.readFileSync('client/assets/badges/catalog.json','utf8')).items;

test('directory browsing keeps profile choices unchanged and customization has its own action',()=>{
 const listeners={},content={innerHTML:''},detail={innerHTML:''};let saved=0,customized=0;
 const modal={classList:{add(){},remove(){}},addEventListener(){},close(){}};
 const document={addEventListener(name,fn){(listeners[name]??=[]).push(fn);},querySelector:s=>({'#modal':modal,'#modal-content':content,'.bc-directory-detail':detail}[s]||null),querySelectorAll:()=>[]};
 const window={};vm.runInNewContext(fs.readFileSync('client/badges.js','utf8').replace('__BADGE_CATALOG__',JSON.stringify(catalog)),{window,document,console});
 window.BiscordBadges.directory({value:'',icon:()=>'',showModal(){},onApply(){saved++;},onCustomize(){customized++;}});
 assert.match(content.innerHTML,/Personalize suas insígnias/);assert.doesNotMatch(content.innerHTML,/data-badge-action="apply"/);
 assert.equal((content.innerHTML.match(/role="tab"/g)||[]).length,9);assert.match(detail.innerHTML,/N|Nitro/i);
 const click=(action,id)=>listeners.click.forEach(fn=>fn({target:{closest:()=>({dataset:{badgeAction:action,id}})},preventDefault(){}}));
 click('detail','streaming-newcomer');assert.match(detail.innerHTML,/Transmita para outros usuários por 1 hora/);assert.doesNotMatch(detail.innerHTML,/data-badge-action="equip"/);assert.equal(saved,0);
 click('customize');assert.equal(customized,1);assert.equal(saved,0);
});
test('badge assets match their recorded hashes and contain no executable SVG content',()=>{assert.ok(catalog.length>60);const ids=new Set();for(const b of catalog){assert.ok(!ids.has(b.id));ids.add(b.id);const data=fs.readFileSync('.'+b.image);assert.equal(createHash('sha256').update(data).digest('hex'),b.sha256);if(b.image.endsWith('.svg')){assert.match(data.toString(),/<svg/);assert.doesNotMatch(data.toString(),/<script|<foreignObject|\bon\w+\s*=/i);}}});
test('badge choices stay pending, enforce six slots and one level per family, and preserve order',()=>{
 const listeners={},html={innerHTML:''},save={disabled:true},notice={hidden:true,textContent:''},preview={innerHTML:''};let closed;const modal={classList:{add(){},remove(){}},addEventListener(name,fn){if(name==='close')closed=fn;},close(){closed?.();closed=null;}};const nodes={'.bc-badge-order':html,'[data-badge-action=apply]':save,'.bc-badge-error':notice,'.bc-badge-live-preview':preview,'#modal':modal};const document={addEventListener(name,fn){(listeners[name]??=[]).push(fn);},querySelector:s=>nodes[s]||null,querySelectorAll:()=>[]};const window={};vm.runInNewContext(fs.readFileSync('client/badges.js','utf8').replace('__BADGE_CATALOG__',JSON.stringify(catalog)),{window,document,console});const manager=window.BiscordBadges,calls=[];const open=()=>manager.open({value:'',icon:()=>'<svg></svg>',showModal(){},onApply:v=>calls.push(v)});const click=(action,id,index)=>{for(const fn of listeners.click)fn({target:{closest:()=>({dataset:{badgeAction:action,id,index}})},preventDefault(){}});};
 const a=catalog.find(b=>b.family==='game-time'),b=catalog.find(x=>x.family==='game-time'&&x.id!==a.id);open();click('toggle',a.id);click('toggle',b.id);assert.match(preview.innerHTML,new RegExp(b.image));assert.ok(!preview.innerHTML.includes(a.image));assert.equal(calls.length,0);click('cancel');assert.equal(calls.length,0);
 open();const chosen=[...new Map(catalog.map(b=>[b.family,b])).values()].slice(0,7);for(const b of chosen)click('toggle',b.id);assert.equal(notice.hidden,false);click('up',null,'1');click('remove',chosen[3].id);click('apply');assert.equal(calls.length,1);const result=calls[0].split(',');assert.equal(result.length,5);assert.equal(result[0],chosen[1].id);assert.ok(!result.includes(chosen[3].id));assert.equal(manager.ids('invalid').length,0);assert.equal(manager.row('invalid'), '');
});

test('Nitro tiers use compact profile icons and separate preview artwork',()=>{const variants=catalog.filter(b=>/^subscriptions-(bronze|silver|gold|platinum|diamond|emerald|ruby|opal)$/.test(b.id));assert.equal(variants.length,8);const window={},document={addEventListener(){}};vm.runInNewContext(fs.readFileSync('client/badges.js','utf8').replace('__BADGE_CATALOG__',JSON.stringify(catalog)),{window,document,console});for(const b of variants){assert.equal(b.image,b.iconImage);assert.notEqual(b.iconImage,b.previewImage);assert.equal(createHash('sha256').update(fs.readFileSync('.'+b.previewImage)).digest('hex'),b.previewSha256);const html=window.BiscordBadges.row(b.id);assert.ok(html.indexOf(b.iconImage)<html.indexOf(b.previewImage));assert.match(b.iconImage,/\.png$/);}});

test('every preview matches the official family and tier artwork without replacing compact icons',()=>{
 const official=JSON.parse(fs.readFileSync('reference-client/badge-art-catalog.json','utf8')).badges;
 let complex=0;
 for(const b of catalog){
  const family=official.find(x=>x.badge_id===b.officialBadgeId);assert.ok(family,b.id);
  const tier=family.tiers.find(x=>x.key===b.officialTierKey)||family;
  assert.equal(b.previewSource,tier.complex_icon_static_url||family.complex_icon_static_url||tier.simple_icon_url||family.simple_icon_url,b.id);
  const bytes=fs.readFileSync('.'+b.previewImage);assert.equal(createHash('sha256').update(bytes).digest('hex'),b.previewSha256,b.id);
  assert.equal(b.image,b.iconImage);assert.notEqual(b.previewImage,b.iconImage);
  if(b.previewImage.endsWith('.svg'))assert.doesNotMatch(bytes.toString(),/<script|<foreignObject|\bon\w+\s*=/i);
  if(b.previewKind==='complex')complex++;
 }
 assert.equal(complex,56);assert.equal(catalog.find(b=>b.id==='streaming-newcomer').previewKind,'complex');
});

test('human catalog excludes app badges and archived Nitro duplicates and sorts progression numerically',async()=>{const {normalizeBadgeIds}=await import('./badge-policy.mjs');for(const id of ['premium-bot','automod','supports-commands','discord-nitro-basic','old-discord-nitro','active-developer'])assert.ok(!catalog.some(b=>b.id===id),id);assert.ok(catalog.some(b=>b.id==='discord-bot-dev'),'the developer badge belongs to a person');const nitro=catalog.filter(b=>b.family==='nitro');assert.deepEqual(nitro.map(b=>b.id),['discord-nitro','subscriptions-bronze','subscriptions-silver','subscriptions-gold','subscriptions-platinum','subscriptions-diamond','subscriptions-emerald','subscriptions-ruby','subscriptions-opal']);for(const family of ['nitro','boost','game-time','game-variety','account-age','streaming','gifting']){const levels=catalog.filter(b=>b.family===family).map(b=>b.level);assert.deepEqual(levels,[...levels].sort((a,b)=>a-b));}assert.equal(normalizeBadgeIds('premium-bot,old-discord-nitro,subscriptions-silver,subscriptions-bronze',catalog),'subscriptions-silver');assert.equal(normalizeBadgeIds('hype-squad-bravery,hype-squad-balance',catalog).split(',').length,1);});
