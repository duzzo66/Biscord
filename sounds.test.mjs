// JavaScript / sounds.test.mjs / Node.js 24+ / sound preferences and playback behavior
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
test('original sounds respect preferences, lifecycle and browser playback failures',async()=>{
 const prefs={soundsEnabled:true,messageSounds:true,soundVolume:50,outputVolume:80,status:'online',notificationTone:'message2',outputDevice:'default'};
 const handlers={},audios=[];let clock=0,rejectPlayback=false;
 class Audio{constructor(src){this.src=src;this.handlers={};audios.push(this);}addEventListener(name,fn){this.handlers[name]=fn;}async play(){if(rejectPlayback)throw Error('NotAllowed');}pause(){this.paused=true;this.handlers.pause?.();}async setSinkId(id){this.sink=id;}}
 const window={BiscordAPI:{session:{preferences:prefs}},addEventListener:(name,fn)=>handlers[name]=fn};
 const sandbox={window,Audio,performance:{now:()=>clock+=500},setTimeout:()=>1,clearTimeout(){},document:{addEventListener:(name,fn)=>handlers[name]=fn,removeEventListener(){}}};
 vm.runInNewContext(fs.readFileSync('client/sounds.js','utf8'),sandbox);
 const sounds=window.BiscordSounds;
 assert.equal(await sounds.play('message'),false,'autoplay remains locked until interaction');
 handlers.pointerdown();assert.equal(await sounds.play('message'),true);assert.equal(audios.at(-1).src,'/client/assets/sounds/message2.mp3');assert.equal(audios.at(-1).volume,.4);
 prefs.deafened=true;assert.equal(await sounds.play('message'),false);assert.equal(await sounds.play('deafen'),true,'control feedback remains audible while deafening');
 prefs.deafened=false;prefs.streamerMode=true;assert.equal(await sounds.play('join'),false);prefs.streamerMode=false;
 prefs.status='dnd';assert.equal(await sounds.play('message'),false);prefs.status='online';prefs.messageSounds=false;assert.equal(await sounds.play('message'),false);
 prefs.soundsEnabled=false;assert.equal(await sounds.play('mute'),false);assert.equal(await sounds.play('mute',{test:true}),true,'explicit samples can be tested independently');sounds.applyPreferences();assert.ok(audios.at(-1).paused);
 prefs.soundsEnabled=true;prefs.outputDevice='speaker';assert.equal(await sounds.play('join'),true);assert.equal(audios.at(-1).sink,'speaker');
 sounds.stop();assert.ok(audios.at(-1).paused);rejectPlayback=true;assert.equal(await sounds.play('leave'),false,'autoplay errors do not escape as rejected promises');
 const manifest=JSON.parse(fs.readFileSync('client/assets/sounds/manifest.json'));assert.equal(manifest.files.length,93);assert.ok(manifest.files.every(file=>file.status==='downloaded'&&fs.statSync('client/assets/sounds/'+file.name).size===file.bytes));
});
