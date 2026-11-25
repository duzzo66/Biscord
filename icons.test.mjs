// JavaScript / icons.test.mjs / Node.js 24 / original Discord SVG extraction
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),acorn=require('acorn');
const {svgFromAST}=require('./reference-client/extract-icons.cjs');
test('SVG extraction retains shapes, groups, opacity and stroke attributes',()=>{
 const ast=acorn.parseExpressionAt('(jsx("svg",{fill:"none",viewBox:"0 0 24 24",children:jsx("g",{opacity:.4,transform:"translate(1 2)",children:[jsx("circle",{cx:10,cy:10,r:4,fill:color}),jsx("rect",{x:1,y:2,width:4,height:5,fill:"none",stroke:color,strokeWidth:2}),jsx("path",{d:"M1 2h3",fillRule:"evenodd",clipRule:"evenodd"})]})}))',0,{ecmaVersion:'latest'});
 const svg=svgFromAST(ast);assert.match(svg,/<g opacity="0.4" transform="translate\(1 2\)">/);assert.match(svg,/<circle cx="10" cy="10" r="4" fill="currentColor">/);assert.match(svg,/<rect x="1" y="2" width="4" height="5" fill="none" stroke="currentColor" stroke-width="2">/);assert.match(svg,/fill-rule="evenodd" clip-rule="evenodd"/);
});
test('all literal UI icons and settings navigation icons have original assets',()=>{
 const icons=JSON.parse(fs.readFileSync('client/assets/icons.json'));
 for(const file of ['client.js','settings.js','profile-editor.js','profile-layout.js']){const source=fs.readFileSync('client/'+file,'utf8');for(const m of source.matchAll(/\b(?:icon|glyph|btn)\('([^']+)'/g))assert.ok(icons[m[1]],file+': '+m[1]);}
 const source=fs.readFileSync('client/settings.js','utf8');for(const m of source.slice(source.indexOf('const groups='),source.indexOf('const sections=')).matchAll(/\['[^']+','[^']+','([^']+)'\]/g))assert.ok(icons[m[1]],m[1]);
 for(const svg of Object.values(icons)){assert.match(svg,/^<svg /);assert.doesNotMatch(svg,/undefined|<script|onload=/);}
});

test('secondary transparent fills preserve cutouts in the help icon',()=>{
 const ast=acorn.parseExpressionAt('(function({secondaryColor:secondary="transparent"}){return jsx("svg",{viewBox:"0 0 24 24",children:[jsx("circle",{cx:12,cy:12,r:10,fill:typeof secondary==="string"?secondary:secondary.css}),jsx("path",{d:"M1 1h2",fill:color})]})})',0,{ecmaVersion:'latest'});
 assert.match(svgFromAST(ast),/<circle[^>]*fill="transparent"/);
 const icons=JSON.parse(fs.readFileSync('client/assets/icons.json'));
 assert.match(icons.help,/<circle[^>]*fill="transparent"/);
 assert.match(icons.userCircle,/fill-rule="evenodd"/);
});

