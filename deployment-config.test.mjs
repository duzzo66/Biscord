// JavaScript / deployment-config.test.mjs / Node 24 / local backend deployment boundaries
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {externalApiOrigin,vercelConfig} from './deployment-config.mjs';
test('external backend accepts only HTTPS origins compatible with SSE',()=>{
 assert.equal(externalApiOrigin('https://chat.example.test/'),'https://chat.example.test');
 for(const input of ['http://chat.example.test','https://user:pass@chat.example.test','https://chat.example.test/api','https://chat.example.test/?secret=x','https://chat.example.test/#x','https://random.trycloudflare.com'])assert.throws(()=>externalApiOrigin(input));
});
test('Vercel routes the API externally without packaging database functions or caching accounts',()=>{
 const c=vercelConfig({'/forgot-password':'auth/index.html','/app':'client/index.html','/foo.bar':'foo.html'},'https://chat.example.test');
 const proxy=c.routes.find(r=>r.dest==='https://chat.example.test/api/$1');assert(proxy);
 assert.equal(c.routes[0].src,'^/api/media$');
 assert.equal(c.functions['api/index.mjs'],undefined);
 assert.equal(c.routes.filter(r=>r.src==='^/forgot-password$').length,1);
 assert.equal(proxy.headers['CDN-Cache-Control'],'no-store');
 assert(proxy.transforms.some(h=>h.target.key==='ngrok-skip-browser-warning'));
 assert.equal(c.routes.find(r=>r.dest==='/foo.html').src,'^/foo\\.bar$');
 assert.equal(c.rewrites,undefined);assert.equal(c.headers,undefined);
});
test('existing Vercel Functions mode remains explicit and available for rollback',()=>{
 const c=vercelConfig({});
 assert.equal(c.rewrites.find(r=>r.source==='/api/:path*').destination,'/api/index');
 assert.equal(c.functions['api/index.mjs'].maxDuration,60);
});
