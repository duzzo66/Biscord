// JavaScript / client/sounds.js / modern browsers / local original Vulpi audio
(()=>{
 const map={message:'message1',mute:'mute',unmute:'unmute',deafen:'deafen',undeafen:'undeafen',join:'user_join',leave:'user_leave',disconnect:'disconnect',calling:'call_calling',ringing:'call_ringing',cameraOn:'camera_on',cameraOff:'camera_off',success:'success',pushStart:'ptt_start',pushStop:'ptt_stop'};
 const tones=new Set(['message1','message2','message3','lofi_message1','bit_message1','bop_message1','asmr_message1']);
 const playing=new Map(),last=new Map();let unlocked=false;
 const prefs=()=>window.BiscordAPI?.session?.preferences||{};
 const nameFor=name=>name==='message'?(tones.has(prefs().notificationTone)?prefs().notificationTone:'message1'):map[name];
 function stop(name){for(const [key,audio] of playing)if(!name||key===name){audio.pause();audio.currentTime=0;playing.delete(key);}}
 async function play(name,{test=false,loop=false}={}){const p=prefs();if(!test&&(!unlocked||p.soundsEnabled===false||p.streamerMode||p.deafened&&!['deafen','undeafen','mute','unmute'].includes(name)||p.status==='dnd'&&['message','ringing'].includes(name)||name==='message'&&p.messageSounds===false))return false;const file=nameFor(name);if(!file)return false;const now=performance.now();if(!test&&now-(last.get(name)||-1000)<160)return false;last.set(name,now);stop(name);const audio=new Audio('/client/assets/sounds/'+file+'.mp3');audio.preload='auto';audio.volume=Math.min(1,Math.max(0,(p.soundVolume??70)/100*(p.outputVolume??100)/100));audio.loop=loop;if(p.outputDevice&&p.outputDevice!=='default'&&audio.setSinkId){try{await audio.setSinkId(p.outputDevice);}catch{}}playing.set(name,audio);const deadline=setTimeout(()=>{if(playing.get(name)===audio)stop(name);},test?6000:30000);audio.addEventListener('pause',()=>clearTimeout(deadline),{once:true});audio.addEventListener('ended',()=>{clearTimeout(deadline);if(playing.get(name)===audio)playing.delete(name);},{once:true});try{await audio.play();return true;}catch{clearTimeout(deadline);playing.delete(name);return false;}}
 function unlock(){unlocked=true;document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);}
 document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
 window.addEventListener('pagehide',()=>stop());
 window.BiscordSounds={play,stop,applyPreferences(){const p=prefs();if(p.soundsEnabled===false||p.streamerMode||p.deafened)stop();else for(const audio of playing.values())audio.volume=Math.min(1,Math.max(0,(p.soundVolume??70)/100*(p.outputVolume??100)/100));}};
})();
