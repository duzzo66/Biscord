// JavaScript / branding/brand-html.mjs / Node.js 24 / public presentation branding
import {load} from 'cheerio';
export const brandText=text=>text.replace(/\b(?:discord|biscord)\b/gi,value=>value===value.toUpperCase()?'VULPI':value===value.toLowerCase()?'vulpi':'Vulpi').replace(/\b(?:Wumpus|Clyde)\b/gi,'Raposa');
export function brandHTML(html){
 const $=load(html,{decodeEntities:false});
 $('.nav_brand_main-logo').attr('src','/brand/vulpi-logo.svg').attr('alt','Vulpi').removeAttr('srcset');
 $('*').contents().filter((_,node)=>node.type==='text').each((_,node)=>{
  if(!$(node).parents('script,style,code,pre,kbd,samp,textarea').length)node.data=brandText(node.data);
 });
 $('*').each((_,node)=>{const el=$(node);for(const key of ['alt','title','aria-label','placeholder'])if(el.attr(key))el.attr(key,brandText(el.attr(key)));});
 $('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[property="og:site_name"],meta[name="twitter:title"],meta[name="twitter:description"]').each((_,node)=>{const el=$(node);if(el.attr('content'))el.attr('content',brandText(el.attr('content')));});
 // Navigation SVGs can contain outlined wordmarks with no text nodes.
 $('footer svg,[class*="footer"] svg').each((_,node)=>{const el=$(node),classes=el.attr('class')||'',word=/wordmark/i.test(classes),symbol=/brandlogo/i.test(classes);if(!word&&!symbol)return;const img=$('<img>').attr('class',classes).attr('src',word?'/brand/vulpi-wordmark.svg':'/brand/fox-mark-white.svg').attr('alt',word?'VULPI':'Vulpi — início');for(const key of ['width','height','style'])if(el.attr(key))img.attr(key,el.attr(key));el.replaceWith(img);});
 $('footer img,[class*="footer"] img').each((_,node)=>{
  const el=$(node),label=el.attr('alt')||'',sources=['src','srcset','data-src','data-srcset','data-lazy-src'].map(key=>el.attr(key)||'').join(' '),classes=el.attr('class')||'';
  const word=/wordmark|(?:^|[\s_-])word(?:$|[\s_-])/i.test(classes+' '+sources)||/^(?:Biscord|Discord|Vulpi)$/i.test(label);
  const symbol=/symbol/i.test(sources)||/^(?:Biscord|Discord|Vulpi).*?(?:home|início)/i.test(label);
  if(!word&&!symbol)return;
  const src=word?'/brand/vulpi-wordmark.svg':'/brand/fox-mark-white.svg';
  el.attr('src',src).removeAttr('srcset').attr('alt',word?'VULPI':'Vulpi — início');
  for(const key of ['data-src','data-srcset','data-lazy-src'])if(el.attr(key))el.attr(key,src);
  el.closest('picture').find('source').remove();
 });
 $('footer [style],[class*="footer"] [style]').each((_,node)=>{const el=$(node),style=el.attr('style');el.attr('style',style.replace(/url\(([^)]*wordmark[^)]*)\)/gi,'url("/brand/vulpi-wordmark.svg")'));});
 $('a[href="/"],a[href="https://discord.com/"]').each((_,node)=>{const el=$(node),svg=el.children('svg');if(svg.length&&(/logo|brand|home|discord/i.test([el.attr('class'),el.attr('aria-label'),svg.attr('class'),svg.attr('aria-label')].join(' ')))){const width=svg.attr('width')||'124',height=svg.attr('height')||'32';svg.replaceWith(`<img src="/brand/vulpi-logo.svg" width="${width}" height="${height}" alt="Vulpi">`);}});
 $('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').remove();
 $('head').append('<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml">');
 if(!$('script[src="/brand/branding.js"]').length)$('head').append('<script src="/brand/branding.js" defer></script>');
 if(!$('link[href="/brand/branding.css"]').length)$('head').append('<link rel="stylesheet" href="/brand/branding.css">');
 return $.html();
}
