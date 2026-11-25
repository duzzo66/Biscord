// JavaScript / profile-editor.test.mjs / Node.js 24+ / profile draft and save lifecycle
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {load} from 'cheerio';
test('profile preview escapes content, keeps drafts local, prevents loss and saves once',async()=>{
 const listeners={},card={innerHTML:''},bar={hidden:true,animate(){}},notice={textContent:'',classList:{toggle(){}}},count={textContent:''};
 const elements={'.profile-card-live':card,'.profile-savebar':bar,'.profile-editor-status':notice,'#profile-about-count':count};
 const document={addEventListener(name,callback){(listeners[name]??=[]).push(callback);},querySelector:selector=>elements[selector]||null,querySelectorAll:()=>[]};
 const user={id:'test-profile',displayName:'Nome atual',username:'perfil',createdAt:1700000000000},calls=[];
 const context={user:()=>user,icon:()=>'<svg></svg>',showModal(){},navigate(){},api:{async updateProfile(data){calls.push({...data});Object.assign(user,data);return user;}}};
 const window={BiscordMotion:{reduced:()=>true}};const sandbox={document,window,Date,console};vm.runInNewContext(fs.readFileSync('client/profile-layout.js','utf8'),sandbox);vm.runInNewContext(fs.readFileSync('client/profile-editor.js','utf8'),sandbox);
 const editor=window.BiscordProfile;let html=editor.render(context);assert.match(html,/pc-layout/);assert.match(html,/Perfil principal/);assert.equal(editor.dirty(),false);
 const change=(name,value)=>{for(const listener of listeners.input)listener({target:{name,value,closest:()=>({})}});};
 change('displayName','Novo <script>alert(1)</script>');change('pronouns','ela/dela');change('about','Uma descrição nova');assert.equal(calls.length,0,'typing does not write to the account');assert.equal(editor.dirty(),true);assert.equal(bar.hidden,false);assert.equal(editor.canLeave(),false);assert.ok(card.innerHTML.includes('&lt;script&gt;'));assert.ok(!card.innerHTML.includes('<script>'));assert.ok(card.innerHTML.includes('ela/dela'));
 const button={disabled:false},form={id:'profile-editor-form',querySelector:()=>button};for(const listener of listeners.submit)await listener({target:form,preventDefault(){},stopImmediatePropagation(){}});
 assert.equal(calls.length,1);assert.equal(user.displayName,'Novo <script>alert(1)</script>');assert.equal(editor.dirty(),false);assert.equal(bar.hidden,true);assert.equal(editor.canLeave(),true);assert.equal(button.disabled,false);
 change('displayName','Descartar isto');for(const listener of listeners.click)listener({target:{closest:()=>({dataset:{profileAction:'reset'}})},preventDefault(){}});assert.equal(editor.dirty(),false);assert.ok(card.innerHTML.includes('Novo &lt;script&gt;'));assert.ok(!card.innerHTML.includes('Descartar isto'));
 editor.resetSession();html=editor.render(context);assert.match(html,/Novo &lt;script&gt;/);assert.equal(editor.dirty(),false);
});

test('cosmetic selector keeps choices pending until Apply and Cancel preserves the draft',()=>{
 const listeners={},preview={innerHTML:''},apply={disabled:true},label={textContent:''};let onClose;const modal={classList:{add(){},remove(){}},addEventListener(name,fn){if(name==='close')onClose=fn;},close(){onClose?.();onClose=null;}};
 const selectors={'#modal':modal,'.pc-collection-preview':preview,'.pc-collection-selected':label,'[data-profile-action=cosmetic-apply]':apply};const document={addEventListener(name,fn){(listeners[name]??=[]).push(fn);},querySelector:s=>selectors[s]||null,querySelectorAll:()=>[]};
 const item={id:'123',kind:'decoration',name:'Teste',collection:'Coleção',thumbnail:'/test.png'};const user={id:'selector-test',displayName:'Teste',username:'teste',createdAt:1},calls=[];const context={user:()=>user,icon:()=>'<svg></svg>',showModal(){},api:{async updateProfile(data){calls.push(data);Object.assign(user,data);return user;}}};const window={BiscordCosmetics:{items:[item],get:(kind,id)=>kind===item.kind&&id===item.id?item:null,decoration:id=>id?'<span class="decoration"></span>':'',layers:()=>'',nameplate:()=>''},BiscordMotion:{reduced:()=>true}};
 const sandbox={document,window,Date,console};vm.runInNewContext(fs.readFileSync('client/profile-layout.js','utf8'),sandbox);vm.runInNewContext(fs.readFileSync('client/profile-editor.js','utf8'),sandbox);const editor=window.BiscordProfile;editor.render(context);
 const click=action=>{for(const fn of listeners.click)fn({target:{closest:()=>({dataset:{profileAction:action,id:'123'}})},preventDefault(){}});};
 click('decoration');click('cosmetic-select');assert.equal(editor.dirty(),false);assert.equal(apply.disabled,false);assert.match(preview.innerHTML,/decoration/);click('selector-close');assert.equal(editor.dirty(),false);assert.equal(calls.length,0);
 click('decoration');click('cosmetic-select');click('cosmetic-apply');assert.equal(editor.dirty(),true);assert.equal(calls.length,0);assert.match(editor.render(context),/pc-avatar-image/);
});
test('nameplate chooser has None and Shop cards, no search, separate library rows and a pending chat preview',()=>{
 const listeners={},preview={innerHTML:''},apply={disabled:true},label={textContent:''};let html='',scrolled=false,onClose;
 const modal={classList:{add(){},remove(){}},addEventListener(name,fn){if(name==='close')onClose=fn;},close(){onClose?.();onClose=null;}};
 const shop={scrollIntoView(){scrolled=true;},querySelector:()=>({focus(){}})};
 const selectors={'#modal':modal,'.pc-collection-preview':preview,'.pc-collection-selected':label,'[data-profile-action=cosmetic-apply]':apply,'#pc-nameplate-shop':shop};
 const document={addEventListener(name,fn){(listeners[name]??=[]).push(fn);},querySelector:s=>selectors[s]||null,querySelectorAll:()=>[]};
 const items=['one','two','three'].map(id=>({id,kind:'nameplate',name:id,collection:'Coleção',thumbnail:'/test.png'}));
 const user={id:'nameplate-test',displayName:'Perfil',username:'perfil',nameplateId:'one',createdAt:1};
 const context={user:()=>user,icon:()=>'<svg></svg>',showModal(title,body){html=body;},api:{}};
 const window={BiscordMotion:{reduced:()=>true},BiscordCosmetics:{items,get:(kind,id)=>items.find(i=>i.kind===kind&&i.id===id),nameplate:id=>id?'<span class="plate-art"></span>':'',decoration:()=>'',layers:()=>''}};
 const sandbox={document,window,Date,console};vm.runInNewContext(fs.readFileSync('client/profile-layout.js','utf8'),sandbox);vm.runInNewContext(fs.readFileSync('client/profile-editor.js','utf8'),sandbox);
 const editor=window.BiscordProfile;editor.render(context);const click=(action,id='')=>{for(const fn of listeners.click)fn({target:{closest:()=>({dataset:{profileAction:action,id}})},preventDefault(){}});};
 click('nameplate');const $=load(html);assert.equal($('input[type="search"]').length,0);assert.equal($('.pc-nameplate-actions [data-profile-action="cosmetic-select"]').length,1);assert.equal($('.pc-nameplate-actions [data-profile-action="nameplate-shop"]').length,1);assert.equal($('.pc-nameplate-owned .pc-nameplate-option').length,3);assert.equal($('#pc-nameplate-shop .pc-nameplate-option').length,0);assert.equal(load(preview.innerHTML)('.pc-nameplate-preview-skeleton').length,4);
 click('nameplate-shop');assert.equal(scrolled,true);click('cosmetic-select','two');assert.equal(apply.disabled,false);assert.equal(editor.dirty(),false);click('selector-close');assert.equal(user.nameplateId,'one');assert.equal(editor.dirty(),false);
});
