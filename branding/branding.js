// JavaScript / branding/branding.js / modern browsers / Biscord presentation updates
(()=>{
 let navFrame=0;
 function syncNavigation(){navFrame=0;const scrolled=window.scrollY>32,root=document.documentElement;if(root.classList.contains('bc-nav-scrolled')!==scrolled)root.classList.toggle('bc-nav-scrolled',scrolled);}
 window.addEventListener('scroll',()=>{if(!navFrame)navFrame=requestAnimationFrame(syncNavigation);},{passive:true});window.addEventListener('pageshow',syncNavigation);syncNavigation();
 const brand=text=>text.replace(/\b(?:discord|biscord|vulpi)\b/gi,'vulcord').replace(/\b(?:Wumpus|Clyde)\b/gi,'Raposa');
 const skip='script,style,code,pre,kbd,samp,textarea,input,[contenteditable],.message,.friend-row,.account-dock,.profile-full,.pf-profile-card';
 const footerSelector='footer,[class*="footer"]';
 function refreshFooters(root){
  if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
  for(const img of root.querySelectorAll('.nav_brand_main-logo')){if(img.getAttribute('src')!=='/brand/vulcord-logo.svg')img.setAttribute('src','/brand/vulcord-logo.svg');if(img.hasAttribute('srcset'))img.removeAttribute('srcset');if(img.getAttribute('alt')!=='vulcord')img.setAttribute('alt','vulcord');}
  const footers=new Set(root.querySelectorAll(footerSelector));if(root.nodeType===Node.ELEMENT_NODE){const parent=root.closest(footerSelector);if(parent)footers.add(parent);}
  const set=(el,key,value)=>{if(el.getAttribute(key)!==value)el.setAttribute(key,value);};
  for(const footer of footers){for(const svg of footer.querySelectorAll('svg')){const classes=svg.getAttribute('class')||'',word=/wordmark/i.test(classes),symbol=/brandlogo/i.test(classes);if(!word&&!symbol)continue;const img=document.createElement('img');img.setAttribute('class',classes);img.setAttribute('src',word?'/brand/vulcord-wordmark.svg':'/brand/fox-mark-white.svg');img.setAttribute('alt',word?'vulcord':'vulcord — início');for(const key of ['width','height','style'])if(svg.hasAttribute(key))img.setAttribute(key,svg.getAttribute(key));svg.replaceWith(img);}for(const img of footer.querySelectorAll('img')){
   const label=img.getAttribute('alt')||'',sources=['src','srcset','data-src','data-srcset','data-lazy-src'].map(k=>img.getAttribute(k)||'').join(' ');
   const word=/wordmark|(?:^|[\s_-])word(?:$|[\s_-])/i.test(img.className+' '+sources)||/^(?:Biscord|Discord|vulcord)$/i.test(label),symbol=/symbol/i.test(sources)||/^(?:Biscord|Discord|vulcord).*?(?:home|início)/i.test(label);
   if(!word&&!symbol)continue;
   const src=word?'/brand/vulcord-wordmark.svg':'/brand/fox-mark-white.svg';set(img,'src',src);set(img,'alt',word?'vulcord':'vulcord — início');if(img.hasAttribute('srcset'))img.removeAttribute('srcset');
   for(const key of ['data-src','data-srcset','data-lazy-src'])if(img.hasAttribute(key))set(img,key,src);
   img.closest('picture')?.querySelectorAll('source').forEach(source=>source.remove());
  }
  for(const el of footer.querySelectorAll('[style]')){const before=el.getAttribute('style'),after=before.replace(/url\(([^)]*wordmark[^)]*)\)/gi,'url("/brand/vulcord-wordmark.svg")');if(after!==before)set(el,'style',after);}}
 }
 function refreshLabels(el){if(el.closest('.message,.friend-row,.account-dock,.profile-full,.pf-profile-card,[contenteditable]'))return;for(const key of ['alt','title','aria-label','placeholder']){const before=el.getAttribute(key);if(before){const after=brand(before);if(after!==before)el.setAttribute(key,after);}}}
 function refresh(root){
  if(root.nodeType===Node.TEXT_NODE){if(!root.parentElement?.closest(skip)){const next=brand(root.data);if(next!==root.data)root.data=next;}return;}
  if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
  const labeled=[...(root.nodeType===Node.ELEMENT_NODE?[root]:[]),...root.querySelectorAll('[alt],[title],[aria-label],[placeholder]')];
  for(const el of labeled)refreshLabels(el);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())refresh(walker.currentNode);
 }
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let animationMap=[];
 function syncMotion(){const reduced=motion.matches||document.body?.classList.contains('reduce-motion');for(const img of document.images){if(img.dataset.brandMotionSource){if(!reduced){img.src=img.dataset.brandMotionSource;delete img.dataset.brandMotionSource;}continue;}if(!reduced)continue;let source;try{source=decodeURIComponent(new URL(img.src,location.href).pathname);}catch{continue;}const item=animationMap.find(x=>'/'+x.file===source);if(item){img.dataset.brandMotionSource=img.src;img.src=item.poster;}}}
 fetch('/brand/manifest.json').then(r=>r.json()).then(m=>{animationMap=m.overrides.filter(x=>x.poster);syncMotion();}).catch(()=>{});motion.addEventListener('change',syncMotion);
 const observer=new MutationObserver(records=>{let added=false;for(const record of records){if(record.type==='characterData')refresh(record.target);else if(record.type==='attributes'){if(record.target===document.body&&record.attributeName==='class')syncMotion();if(['alt','title','aria-label','placeholder'].includes(record.attributeName))refreshLabels(record.target);refreshFooters(record.target);}else for(const node of record.addedNodes){refresh(node);refreshFooters(node);added=true;}}if(added&&animationMap.length)syncMotion();});
 refresh(document);refreshFooters(document);observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['src','srcset','data-src','data-srcset','data-lazy-src','style','alt','title','aria-label','placeholder','class']});
})();
