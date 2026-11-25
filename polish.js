// JavaScript / polish.js / modern browsers / lightweight shared interaction polish
(()=>{
 if(window.BiscordMotion)return;
 const preference=matchMedia('(prefers-reduced-motion:reduce)');
 const reduced=()=>preference.matches||document.body.classList.contains('reduce-motion');
 const animations=new Set();
 function enter(element,duration=160){if(!element||reduced()||!element.animate)return;const animation=element.animate([{opacity:.65},{opacity:1}],{duration,easing:'cubic-bezier(.2,.8,.2,1)'});animations.add(animation);animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));}
 const stop=()=>{if(reduced())for(const animation of animations)animation.cancel();};
 preference.addEventListener('change',stop);
 window.BiscordMotion={enter,reduced};
 const seen=new Set();document.querySelectorAll('[data-message]').forEach(el=>seen.add(el.dataset.message));
 const workspace=document.querySelector('#workspace');
 if(workspace){const observer=new MutationObserver(records=>{stop();for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;const messages=[...(node.matches('[data-message]')?[node]:[]),...node.querySelectorAll('[data-message]')];for(const message of messages){const id=message.dataset.message;if(!seen.has(id)&&!reduced())message.classList.add('biscord-new-message');seen.add(id);}}if(seen.size>10000){const tail=[...seen].slice(-5000);seen.clear();tail.forEach(id=>seen.add(id));}});observer.observe(workspace,{childList:true,subtree:true});}
 // Preserve scroll position on renders. Only a route change fades the main pane.
 let route=location.pathname;
 document.addEventListener('click',()=>{requestAnimationFrame(()=>{if(location.pathname!==route){route=location.pathname;enter(workspace,140);}});});
 window.addEventListener('popstate',()=>{route=location.pathname;enter(workspace,140);});
 // Images with explicit dimensions can decode off the interaction path.
 document.querySelectorAll('img[width][height]').forEach(image=>{if(!image.hasAttribute('decoding'))image.decoding='async';});
})();
