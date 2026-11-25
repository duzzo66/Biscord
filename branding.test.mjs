// JavaScript / branding.test.mjs / Node.js 24 / Biscord presentation invariants
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brandHTML} from './branding/brand-html.mjs';
import {load} from 'cheerio';
test('branding replaces displayed names and metadata without breaking URLs or documentation code',()=>{
 const html=brandHTML('<!doctype html><html><head><title>Discord</title><meta property="og:description" content="Discord e Wumpus"></head><body><h1>DISCORD</h1><img src="/assets/discord.com/wumpus.webp" alt="Wumpus do Discord"><a href="https://discord.com/api">discord</a><code>DiscordSDK()</code><script>const key="discord";</script></body></html>');
 const $=load(html);assert.equal($('title').text(),'Vulpi');assert.equal($('h1').text(),'VULPI');assert.equal($('img').attr('alt'),'Raposa do Vulpi');assert.equal($('img').attr('src'),'/assets/discord.com/wumpus.webp');assert.equal($('a').attr('href'),'https://discord.com/api');assert.equal($('code').text(),'DiscordSDK()');assert.equal($('script:not([src])').text(),'const key="discord";');assert.equal($('meta').attr('content'),'Vulpi e Raposa');
 const rebuilt=load(brandHTML(html));assert.equal(rebuilt('script[src="/brand/branding.js"]').length,1);assert.equal(rebuilt('link[rel="icon"]').length,1);
});
test('all mapped mascot replacements exist and retain their file signatures',()=>{
 const files=JSON.parse(fs.readFileSync('branding/overrides.json'));
 assert.ok(files.length>=60);
 for(const item of files){const bytes=fs.readFileSync('branding/overrides/'+item.file);assert.ok(bytes.length>100,item.file);assert.ok(item.size[0]>0&&item.size[1]>0);if(item.file.endsWith('.gif'))assert.match(bytes.subarray(0,6).toString(),/^GIF8[79]a$/);if(item.file.endsWith('.png'))assert.equal(bytes.subarray(1,4).toString(),'PNG');}
});
test('legacy and responsive footers cannot load the original wordmark through lazy attributes or picture sources',()=>{
 const $=load(brandHTML('<html><head></head><body><div class="discord-2022--footer"><picture><source media="(max-width:600px)" srcset="https://cdn.example/Wordmark-mobile.svg"><img class="discord-2022--word" src="blank.gif" data-src="https://cdn.example/Wordmark.svg" data-srcset="https://cdn.example/Wordmark.svg 2x" srcset="https://cdn.example/Wordmark.svg 2x" alt=""></picture><a href="/"><img src="https://cdn.example/Symbol.svg" alt="Discord Home"></a><img src="twitter.svg" alt="Twitter"></div></body></html>'));
 const word=$('picture img');assert.equal(word.attr('src'),'/brand/vulpi-wordmark.svg');assert.equal(word.attr('data-src'),'/brand/vulpi-wordmark.svg');assert.equal(word.attr('data-srcset'),'/brand/vulpi-wordmark.svg');assert.equal(word.attr('srcset'),undefined);assert.equal($('picture source').length,0);assert.equal($('a img').attr('src'),'/brand/fox-mark-white.svg');assert.equal($('img[alt="Twitter"]').attr('src'),'twitter.svg');
});
test('outlined footer SVG branding is replaced without changing social icons',()=>{
 const $=load(brandHTML('<html><head></head><body><footer><svg class="brandLogo-2oAxnA" viewBox="0 0 59 44"><path d="M1 1"></path></svg><svg class="wordmark-2xw0yW" width="100%" viewBox="0 0 1843 293"><path d="M2 2"></path></svg><svg class="socialIcon-38NB2e"><path d="M3 3"></path></svg></footer></body></html>'));
 assert.equal($('img.wordmark-2xw0yW').attr('src'),'/brand/vulpi-wordmark.svg');assert.equal($('img.wordmark-2xw0yW').attr('width'),'100%');assert.equal($('img.brandLogo-2oAxnA').attr('src'),'/brand/fox-mark-white.svg');assert.equal($('footer svg').length,1);assert.equal($('svg.socialIcon-38NB2e path').attr('d'),'M3 3');
});
