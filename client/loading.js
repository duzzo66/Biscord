// JavaScript / loading.js / modern browsers / Vulpi startup lifecycle
(()=>{'use strict';
 const screen=document.querySelector('#biscord-loading');if(!screen)return;
 const client=document.querySelector('#client');client?.setAttribute('inert','');
 let finished=false,failed=false;const started=performance.now();
 const timeout=setTimeout(()=>fail('A conexão está demorando mais que o esperado. Verifique sua conexão e tente novamente.'),30000);
 function fail(message){if(finished)return;failed=true;clearTimeout(timeout);screen.classList.add('has-error');screen.querySelector('p').textContent=message||'Não foi possível conectar ao Vulpi.';screen.querySelector('button').hidden=false;screen.setAttribute('role','alert');}
 async function finish(){if(finished||failed)return;finished=true;clearTimeout(timeout);const mark=screen.querySelector('.biscord-loading-mark');try{await mark?.decode();}catch{}await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches||document.body.classList.contains('reduce-motion');const remaining=Math.max(0,700-(performance.now()-started));if(remaining)await new Promise(resolve=>setTimeout(resolve,remaining));client?.removeAttribute('inert');screen.classList.add('is-ready');setTimeout(()=>screen.remove(),reduced?0:240);}
 screen.querySelector('button').addEventListener('click',()=>location.reload());
 window.BiscordLoading={finish,fail};
})();
