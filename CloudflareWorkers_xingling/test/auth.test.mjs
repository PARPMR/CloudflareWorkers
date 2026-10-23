import test from 'node:test';
import assert from 'node:assert/strict';
import {apiHandler} from '../src/api.js';
import {authHandler} from '../src/auth.js';
import {callTool} from '../src/store.js';
const req=(name,headers={})=>new Request('https://persona.example/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:{}}})});
const bindings={ALLOWED_GITHUB_USER_ID:'129664964'};
const challenge=()=>new Response(null,{status:403});
test('raw identity headers cannot authorize the service',async()=>{
 assert.equal((await apiHandler(req('xingleng_persona_read',{'oai-authenticated-user-id':'129664964'}),bindings,{},challenge)).status,401);
 await assert.rejects(callTool('xingleng_persona_read',{},req('x',{'oai-authenticated-user-id':'forged'}),{}),e=>e.code==='AUTH_REQUIRED');
});
test('verified identity must match owner and writes require scope',async()=>{
 assert.equal((await apiHandler(req('xingleng_persona_read'),bindings,{props:{githubId:'999'},auth:{scope:['mcp:read','mcp:write']}},challenge)).status,401);
 assert.equal((await apiHandler(req('xingleng_persona_commit'),bindings,{props:{githubId:'129664964'},auth:{scope:['mcp:read']}},challenge)).status,403);
});
test('consent escapes client metadata and prevents framing',async()=>{
 const oauth={parseAuthRequest:async()=>({}),describeConsent:async()=>({clientName:'<script>bad()</script>',redirectHost:'client.example',scope:['mcp:read']}),beginConsent:async()=>({handle:'handle',headers:new Headers()})};
 const res=await authHandler(new Request('https://persona.example/authorize'),{PUBLIC_BASE_URL:'https://persona.example',OAUTH_PROVIDER:oauth});
 const body=await res.text();
 assert.ok(body.includes('&#60;script&#62;'));assert.ok(!body.includes('<script>bad()'));
 assert.ok(body.includes('client.example'));
 assert.ok(res.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
});
test('callback authorizes only configured numeric owner and does not retain upstream token',async()=>{
 let completed;
 const oauth={finishUpstream:async()=>({request:{scope:['mcp:read']},data:{verifier:'v'},headers:new Headers()}),completeAuthorization:async data=>{completed=data;return{redirectTo:'https://client.example/cb'}}};
 const env={PUBLIC_BASE_URL:'https://persona.example',GITHUB_CLIENT_ID:'test',GITHUB_CLIENT_SECRET:'test',ALLOWED_GITHUB_USER_ID:'129664964',OAUTH_PROVIDER:oauth};
 const upstream=id=>async url=>Response.json(String(url).endsWith('/access_token')?{access_token:'test-only'}:{id,login:'PARPMR'});
 let res=await authHandler(new Request('https://persona.example/callback?code=test'),env,upstream(999));
 assert.equal(res.status,403);assert.equal(completed,undefined);
 res=await authHandler(new Request('https://persona.example/callback?code=test'),env,upstream(129664964));
 assert.equal(res.status,302);assert.equal(completed.userId,'129664964');
 assert.deepEqual(completed.props,{githubId:'129664964',login:'PARPMR'});
 assert.ok(!JSON.stringify(completed).includes('test-only'));
});

