// JavaScript / navigation.js / browser / archived public-page navigation
(()=>{
 let routes;
 const ready=fetch('/route-map.json').then(r=>r.json()).then(data=>{routes=new Set(Object.keys(data));return routes;});
 const localize=href=>{try{const u=new URL(href,location.href);if(!['https://discord.com','https://docs.discord.com'].includes(u.origin))return null;if(u.hostname==='discord.com'&&['/app','/login'].includes(u.pathname))return '/login';const hash=u.hash;u.hash='';u.pathname=u.pathname.replace(/\/+$/,'')||'/';for(const key of [...u.searchParams.keys()])if(!/^(?:page|.*_page)$/.test(key))u.searchParams.delete(key);u.searchParams.sort();const route=(u.hostname==='docs.discord.com'?'/documentation':'')+u.pathname+u.search;return routes?.has(route)?route+hash:null;}catch{return null;}};
 ready.then(()=>{for(const a of document.querySelectorAll('a[href]')){const local=localize(a.href);if(local)a.href=local;}}).catch(()=>{});
 document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const local=localize(a.href);if(local)a.href=local;},true);
 // Webflow handles native dropdowns, tabs, accordions and video controls.
 // SSR-only public directory pages retain working search over their copied cards.
 for(const field of document.querySelectorAll('input[type="search"],input[role="searchbox"]')){
  const cards=[...document.querySelectorAll('main article,main [class*="card"],main [class*="Card"],[role="button"][class*="card"],[role="button"][class*="Card"]')].filter(el=>el.textContent.trim().length>15);
  if(cards.length)field.addEventListener('input',()=>{for(const card of cards)card.hidden=!card.textContent.toLowerCase().includes(field.value.toLowerCase());});
 }
 document.querySelectorAll('button').forEach(button=>{
  const text=button.textContent.trim();if(text==='Criar conta')button.addEventListener('click',()=>location.href='/register');
  if(text==='Entrar')button.addEventListener('click',()=>location.href='/login');
 });
 if(location.pathname==='/application-directory'){
  const cards=[...new Set([...document.querySelectorAll('h4')].map(heading=>heading.closest('[class*="card_"]')?.parentElement).filter(Boolean))];
  const allTerms=['destaques','featured'];
  document.querySelectorAll('[role="tab"]').forEach(tab=>tab.addEventListener('click',()=>{const term=tab.textContent.trim().toLowerCase();document.querySelectorAll('[role="tab"]').forEach(other=>other.setAttribute('aria-selected',String(other===tab)));for(const card of cards)card.hidden=!allTerms.includes(term)&&!card.textContent.toLowerCase().includes(term);}));
  const search=document.querySelector('input[role="searchbox"]');search?.addEventListener('input',()=>{for(const card of cards)card.hidden=!card.textContent.toLowerCase().includes(search.value.toLowerCase());});
 }
 if(location.pathname.startsWith('/documentation/')){
  for(const button of document.querySelectorAll('button[aria-label^="Switch to"]'))button.addEventListener('click',()=>{const label=button.getAttribute('aria-label');const dark=label.includes('dark')||(label.includes('system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.classList.toggle('light',!dark);});
  for(const button of document.querySelectorAll('button[aria-label="Copy page"]'))button.addEventListener('click',()=>navigator.clipboard.writeText(document.querySelector('main')?.innerText||document.body.innerText).catch(()=>{}));
  for(const button of document.querySelectorAll('button[aria-label*="Copy code"]'))button.addEventListener('click',()=>navigator.clipboard.writeText(button.closest('[class*="code"]')?.querySelector('code')?.innerText||'').catch(()=>{}));
  for(const button of document.querySelectorAll('button[aria-expanded][aria-controls]'))button.addEventListener('click',()=>{const target=document.getElementById(button.getAttribute('aria-controls'));if(target){const expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));target.hidden=expanded;}});
  for(const button of document.querySelectorAll('button[aria-label="Open search"]'))button.addEventListener('click',()=>location.href='/__archive/');
 }
})();
