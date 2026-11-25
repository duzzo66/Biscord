// JavaScript / desktop.test.mjs / Node 24 / desktop navigation boundaries
import {test} from 'node:test';
import assert from 'node:assert/strict';
import navigation from './desktop/navigation.cjs';
const {serverURL,internalURL}=navigation;
test('desktop accepts HTTPS servers and local HTTP, rejects credentials and other protocols',()=>{
 for(const value of ['https://example.test/path','http://localhost:4173','http://127.0.0.1:4173'])assert.ok(serverURL(value).origin);
 for(const value of ['http://example.test','file:///tmp/app','javascript:alert(1)','https://user:pass@example.test'])assert.throws(()=>serverURL(value));
 assert.equal(serverURL('https://example.test/path?secret=1').href,'https://example.test/');
});
test('desktop keeps authentication, invitations and workspace in the app on the configured origin',()=>{
 const base=serverURL('https://example.test');
 for(const route of ['/channels','/channels/@me','/login','/register','/forgot-password','/reset-password?token=abc','/invite/abc','/app'])assert.equal(internalURL(new URL(route,base).href,base),true,route);
 for(const value of ['https://other.test/login','https://example.test:444/login','https://example.test/','https://example.test/login-evil','https://user@example.test/login','javascript:alert(1)'])assert.equal(internalURL(value,base),false,value);
});
