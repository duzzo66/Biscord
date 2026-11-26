// JavaScript / interactions.js / browser / local home interactions
document.addEventListener('DOMContentLoaded',()=>{
 const banner=document.createElement('section');banner.className='local-cookie-banner';banner.setAttribute('aria-label','Preferências de cookies');
 banner.innerHTML='<div><h2>vulcord</h2><p>Ao clicar em "Aceitar todos os cookies", concorda com o armazenamento de cookies no seu dispositivo para melhorar a navegação no site, analisar a utilização do site e ajudar nas nossas iniciativas de marketing.</p></div><div class="local-cookie-actions"><button class="cookie-settings">Definições de cookies</button><button data-consent="rejected">Rejeitar Todos</button><button data-consent="accepted">Aceitar todos os cookies</button></div><button class="local-cookie-close" aria-label="Fechar">×</button>';
 banner.hidden=!!localStorage.getItem('biscord-cookie-consent');document.body.append(banner);
 const preferences=document.createElement('section');preferences.className='local-cookie-preferences';preferences.hidden=true;preferences.setAttribute('role','dialog');preferences.setAttribute('aria-modal','true');preferences.setAttribute('aria-label','Configurações de cookies');
 preferences.innerHTML='<div><h2>Configurações de cookies</h2><p>Cookies necessários: sempre ativos.</p><label><input type="checkbox" id="optional-cookies"> Permitir cookies opcionais</label><br><button>Salvar preferências</button></div>';document.body.append(preferences);
 const closeConsent=value=>{localStorage.setItem('biscord-cookie-consent',value);banner.hidden=true;preferences.hidden=true;};
 banner.querySelectorAll('[data-consent]').forEach(button=>button.addEventListener('click',()=>closeConsent(button.dataset.consent)));
 banner.querySelector('.local-cookie-close').addEventListener('click',()=>closeConsent('dismissed'));
 const showPreferences=()=>{preferences.hidden=false;preferences.querySelector('input').checked=localStorage.getItem('biscord-cookie-consent')==='accepted';preferences.querySelector('input').focus();};
 banner.querySelector('.cookie-settings').addEventListener('click',showPreferences);
 preferences.querySelector('button').addEventListener('click',()=>closeConsent(preferences.querySelector('input').checked?'accepted':'rejected'));
 preferences.addEventListener('click',e=>{if(e.target===preferences)preferences.hidden=true;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')preferences.hidden=true;});
 document.querySelectorAll('a').forEach(a=>{
  const text=a.textContent.trim();
  if(/Cookie Settings|Configurações de cookies/.test(text)){a.href='#';a.addEventListener('click',e=>{e.preventDefault();showPreferences();});}
  if(/Download for Windows|Baixar para Windows/.test(text))a.href='https://discord.com/api/downloads/distributions/app/installers/latest?channel=stable&platform=win&arch=x64';
 });
 document.querySelectorAll('[data-locale], [data-language]').forEach(a=>a.addEventListener('click',e=>{
  const code=a.dataset.locale||a.dataset.language;
  if(code==='pt-BR'||code==='en'){e.preventDefault();window.setBiscordLanguage(code);document.querySelectorAll('.w-dropdown-toggle.w--open').forEach(toggle=>toggle.click());}
  else if(code){e.preventDefault();location.href='https://discord.com'+location.pathname+'?locale='+encodeURIComponent(code);}
 }));
 // Keep the original silent looping feature videos; honor reduced motion.
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 document.querySelectorAll('video').forEach(video=>{video.muted=true;video.playsInline=true;if(reduced.matches)video.pause();else video.play().catch(()=>{});});
});
