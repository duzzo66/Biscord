// JavaScript / preload.cjs / Electron sandbox / native window theme synchronization
const {ipcRenderer}=require('electron');
window.addEventListener('DOMContentLoaded',()=>{
 const style=document.createElement('style');style.textContent=`
 #biscord-window-controls{position:fixed;right:0;top:0;height:32px;display:flex;z-index:2147483647;background:transparent;color:#f2f3f5;-webkit-app-region:no-drag}
 #biscord-window-controls button{all:unset;box-sizing:border-box;width:46px;height:32px;display:grid;place-items:center;cursor:default;background:transparent;color:inherit;-webkit-app-region:no-drag}
 #biscord-window-controls button:hover{background:color-mix(in srgb,currentColor 12%,transparent)}
 #biscord-window-controls button:active{background:color-mix(in srgb,currentColor 20%,transparent)}
 #biscord-window-controls button:last-child:hover{background:#c42b1c;color:white}
 #biscord-window-controls button:focus-visible{outline:2px solid currentColor;outline-offset:-3px}
 #biscord-window-controls svg{width:12px;height:12px;pointer-events:none}
 .app-bar{-webkit-app-region:drag;padding-right:140px!important}.app-bar-actions{right:150px!important}
 `;document.head.append(style);
 const controls=document.createElement('div');controls.id='biscord-window-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Controles da janela');
 for(const [action,label,path] of [['minimize','Minimizar','M1 6h10'],['maximize','Maximizar ou restaurar','M1.5 1.5h9v9h-9z'],['close','Fechar','M1 1l10 10M11 1 1 11']]){const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',label);button.title=label;button.innerHTML=`<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1"><path d="${path}"/></svg>`;button.addEventListener('click',()=>ipcRenderer.send('biscord:window-action',action));controls.append(button);}
 document.body.append(controls);
 let frame=0,last='';
 function update(){frame=0;let rgb=[35,36,40];const loading=document.querySelector('.biscord-loading:not(.is-ready)');const target=loading||document.querySelector('.app-bar')||document.body;const layers=[];for(let e=target;e;e=e.parentElement)layers.unshift(e);
  for(const e of layers){const c=getComputedStyle(e).backgroundColor.match(/[\d.]+/g);if(!c||c.length<3)continue;const alpha=c.length>3?Number(c[3]):1;rgb=rgb.map((v,i)=>Math.round(Number(c[i])*alpha+v*(1-alpha)));}
  const background='#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');const luminance=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);const foreground=luminance>.179?'#202024':'#f2f3f5';const key=background+foreground;if(key!==last){last=key;controls.style.color=foreground;}
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update);}
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class','style','data-theme'],childList:true});
 new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
 matchMedia('(prefers-color-scheme:dark)').addEventListener('change',schedule);update();
});
