import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';

// Exercise the installed 1.2.4 provider. Only the unused Workers RPC base class
// and the local KV storage boundary are replaced; OAuth crypto/cookies are real.
registerHooks({resolve(specifier, context, next) {
  if (specifier === 'cloudflare:workers') return {
    url:'data:text/javascript,export class WorkerEntrypoint {}', shortCircuit:true
  };
  return next(specifier, context);
}});
globalThis.Cloudflare = {compatibilityFlags:{global_fetch_strictly_public:true}};
const {default:worker} = await import('../src/index.js');
const base = 'https://persona.example';
class MemoryKV {
  data = new Map();
  failTransactions = false;
  failTransactionWrites = false;
  async get(key, options) {
    if (this.failTransactions && key.startsWith('transaction:')) throw Error('sensitive test-only KV detail');
    const value = this.data.get(key) ?? null;
    return (options === 'json' || options?.type === 'json') && value !== null ? JSON.parse(value) : value;
  }
  async put(key, value) {
    if (this.failTransactionWrites && key.startsWith('transaction:')) throw Error('sensitive test-only KV detail');
    if (this.failTransactions && key.startsWith('transaction:')) throw Error('sensitive test-only KV detail');
    this.data.set(key, value);
  }
  async delete(key) { this.data.delete(key); }
  async list({prefix='' }={}) { return {keys:[...this.data.keys()].filter(name=>name.startsWith(prefix)).map(name=>({name})),list_complete:true}; }
}
class MemoryR2 {
  data=new Map(); writes=0;
  async get(key){const item=this.data.get(key);return item?{etag:item.etag,json:async()=>JSON.parse(item.body)}:null;}
  async put(key,body,{onlyIf}){
    const old=this.data.get(key);
    if(onlyIf.get('If-None-Match')==='*'&&old)return null;
    if(onlyIf.get('If-Match')&&onlyIf.get('If-Match')!=='"'+old?.etag+'"')return null;
    const item={body,etag:String(++this.writes)};this.data.set(key,item);return {etag:item.etag};
  }
}
async function beginFlow(requestedScopes=['mcp:read','mcp:write','offline_access']) {
  const env = {PUBLIC_BASE_URL:base, ALLOWED_GITHUB_USER_ID:'129664964',
    GITHUB_CLIENT_ID:'test-client', GITHUB_CLIENT_SECRET:'test-only', BUCKET:new MemoryR2(), OAUTH_KV:new MemoryKV()};
  const ctx = {waitUntil() {}};
  const send = request => worker.fetch(request, env, ctx);
  const registration = await send(new Request(base+'/oauth/register', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({client_name:'Regression client', redirect_uris:['https://client.example/callback'],
      grant_types:['authorization_code','refresh_token'], response_types:['code'], token_endpoint_auth_method:'none'})
  }));
  assert.equal(registration.status, 201);
  const client = await registration.json();
  const verifier = 'test-verifier-'+'v'.repeat(48);
  const challenge = Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))).toString('base64url');
  const url = new URL(base+'/authorize');
  url.search = new URLSearchParams({client_id:client.client_id, redirect_uri:'https://client.example/callback',
    response_type:'code', scope:requestedScopes.join(' '), state:'test-client-state',
    code_challenge:challenge, code_challenge_method:'S256'});
  const consent = await send(new Request(url));
  assert.equal(consent.status, 200);
  const html = await consent.text();
  const handle = /name="handle" value="([^"]+)"/.exec(html)?.[1];
  assert.ok(handle);
  const cookie = consent.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  assert.ok(cookie);
  const approve = (cookies=cookie, selectedScopes=requestedScopes) => {
    const form=new URLSearchParams({handle,decision:'approve'});
    for(const scope of selectedScopes)form.append('scope',scope);
    return send(new Request(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:base,Cookie:cookies},body:form}));
  };
  return {env, approve, cookie, handle, send, client, verifier, html};
}
async function failure(flow, cookies, code, status=400, stage='consent_approve') {
  const logs = [];
  const original = console.warn;
  console.warn = (...args) => logs.push(args.join(' '));
  let response;
  try { response = await flow.approve(cookies); } finally { console.warn = original; }
  const body = await response.text();
  assert.equal(response.status, status);
  assert.equal(response.headers.get('X-Xingleng-Auth-Error'), code);
  assert.equal(response.headers.get('X-Xingleng-Auth-Stage'), stage);
  assert.ok(body.includes(code));
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const diagnostic = body + logs.join('\n');
  for (const secret of [flow.handle, flow.cookie, 'test-only', 'sensitive test-only KV detail', 'test-client-state'])
    assert.ok(!diagnostic.includes(secret), 'diagnostics must not disclose '+secret);
  assert.equal(logs.length, 1);
}

test('real OAuth provider redirects a fresh browser-bound approval to GitHub', async () => {
  const flow = await beginFlow();
  const approved = await flow.approve();
  assert.equal(approved.status, 302);
  const location = new URL(approved.headers.get('Location'));
  assert.equal(location.origin, 'https://github.com');
  assert.equal(location.pathname, '/login/oauth/authorize');
  assert.equal(location.searchParams.get('redirect_uri'), base+'/callback');
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(location.searchParams.get('state'));
  assert.equal(approved.headers.getSetCookie().length, 2, 'clear consent and set upstream cookies separately');
});
test('real OAuth missing browser cookie has a safe actionable diagnostic', async () => {
  const flow = await beginFlow();
  await failure(flow, '', 'AUTH_BROWSER_COOKIE_MISSING');
});
test('real OAuth mismatched browser cookie remains rejected', async () => {
  const flow = await beginFlow();
  await failure(flow, flow.cookie.replace(/=.+$/, '=incorrect'), 'AUTH_BROWSER_COOKIE_MISMATCH');
});
test('real OAuth reused approval is distinguishable from a missing cookie', async () => {
  const flow = await beginFlow();
  assert.equal((await flow.approve()).status, 302);
  await failure(flow, flow.cookie, 'AUTH_TRANSACTION_EXPIRED');
});
test('real OAuth unavailable transaction state remains rejected', async () => {
  const flow = await beginFlow();
  for (const key of flow.env.OAUTH_KV.data.keys()) if (key.startsWith('transaction:')) flow.env.OAUTH_KV.data.delete(key);
  await failure(flow, flow.cookie, 'AUTH_TRANSACTION_EXPIRED');
});
test('KV failure is a service error and never exposes raw exception details', async () => {
  const flow = await beginFlow();
  flow.env.OAUTH_KV.failTransactions = true;
  await failure(flow, flow.cookie, 'AUTH_SERVICE_ERROR', 503);
});

test('KV failure starting GitHub sign-in identifies upstream_begin without leaking data', async () => {
  const flow = await beginFlow();
  flow.env.OAUTH_KV.failTransactionWrites = true;
  await failure(flow, flow.cookie, 'AUTH_SERVICE_ERROR', 503, 'upstream_begin');
});

async function authorizeFlow(flow,selectedScopes) {
  const approval = await flow.approve(undefined,selectedScopes);
  assert.equal(approval.status,302);
  const github = new URL(approval.headers.get('Location'));
  const upstreamCookie = approval.headers.getSetCookie().find(value=>value.startsWith('__Host-oauth-upstream-')).split(';')[0];
  const callbackUrl = new URL(base+'/callback');
  callbackUrl.search = new URLSearchParams({code:'test-github-code',state:github.searchParams.get('state')});
  const upstreamRequests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url,options) => {
    upstreamRequests.push(String(url));
    if (String(url)==='https://github.com/login/oauth/access_token') {
      assert.equal(options.body.get('code'),'test-github-code');
      const verifier=options.body.get('code_verifier');
      assert.equal(Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))).toString('base64url'),github.searchParams.get('code_challenge'));
      return Response.json({access_token:'test-upstream-token'});
    }
    assert.equal(String(url),'https://api.github.com/user');
    assert.equal(options.headers.Authorization,'Bearer test-upstream-token');
    return Response.json({id:129664964,login:'PARPMR'});
  };
  let callback;
  try {callback=await flow.send(new Request(callbackUrl,{headers:{Cookie:upstreamCookie}}));}
  finally {globalThis.fetch=originalFetch;}
  assert.equal(callback.status,302);
  assert.equal(upstreamRequests.length,2);
  const clientRedirect = new URL(callback.headers.get('Location'));
  assert.equal(clientRedirect.origin,'https://client.example');
  assert.equal(clientRedirect.searchParams.get('state'),'test-client-state');
  assert.ok(clientRedirect.searchParams.get('code'));
  const exchange=await flow.send(new Request(base+'/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({
    grant_type:'authorization_code',client_id:flow.client.client_id,code:clientRedirect.searchParams.get('code'),redirect_uri:'https://client.example/callback',code_verifier:flow.verifier
  })}));
  assert.equal(exchange.status,200);
  const token=await exchange.json();
  assert.ok(token.access_token);
  return token;
}

test('real provider completes consent, mocked GitHub identity, token exchange and authenticated MCP discovery', async () => {
  const flow = await beginFlow();
  const token=await authorizeFlow(flow);
  assert.ok(token.refresh_token);
  const discovery=await flow.send(new Request(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token.access_token},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})}));
  assert.equal(discovery.status,200);
  const tools=(await discovery.json()).result.tools.map(tool=>tool.name);
  assert.ok(tools.includes('xingleng_persona_read'));
  assert.ok(tools.includes('xingleng_persona_commit'));
  for(const tool of (await (await flow.send(new Request(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token.access_token},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list'})}))).json()).result.tools){
    const scopes=['xingleng_persona_initialize','xingleng_persona_commit'].includes(tool.name)?['mcp:read','mcp:write']:['mcp:read'];
    assert.deepEqual(tool.securitySchemes,[{type:'oauth2',scopes}]);
    assert.deepEqual(tool._meta.securitySchemes,tool.securitySchemes);
  }
  const stored=JSON.stringify([...flow.env.OAUTH_KV.data.values()]);
  assert.ok(!stored.includes('test-upstream-token'),'GitHub access token must not be retained');
});


function invoke(flow,token,name,args={}) {
  return flow.send(new Request(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token.access_token},body:JSON.stringify({jsonrpc:'2.0',id:9,method:'tools/call',params:{name,arguments:args}})}));
}
test('read-only OAuth token reads state and history but returns an actionable tool-level write challenge',async()=>{
  const flow=await beginFlow(['mcp:read']);
  const token=await authorizeFlow(flow);
  assert.ok(!token.scope.split(' ').includes('mcp:write'));
  const read=await invoke(flow,token,'xingleng_persona_read');
  assert.equal(read.status,200);
  const state=(await read.json()).result.structuredContent;
  assert.equal(state.initialized,false);
  assert.equal(state.authorization.can_write,false);
  assert.deepEqual(state.authorization.granted_scopes,['mcp:read']);
  const history=await invoke(flow,token,'xingleng_persona_history',{limit:3});
  assert.equal(history.status,200);
  assert.equal((await history.json()).result.structuredContent.events.length,2);
  const initialize=await invoke(flow,token,'xingleng_persona_initialize',{confirmed:true,confirmation:'Test migration authorization'});
  assert.equal(initialize.status,200,'Use a tool-level OAuth challenge rather than an expired-session transport response');
  const result=(await initialize.json()).result;
  assert.equal(result.isError,true);
  const challenge=result._meta['mcp/www_authenticate'][0];
  for(const part of ['error="insufficient_scope"','mcp:write','error_description=','resource_metadata="'+base+'/.well-known/oauth-protected-resource/mcp"'])assert.ok(challenge.includes(part));
  assert.equal(flow.env.BUCKET.writes,0);
});
test('read-scope client can explicitly opt into write on consent and initialize only after confirmation',async()=>{
  const flow=await beginFlow(['mcp:read']);
  const checkbox=/<input[^>]+name="scope"[^>]+value="mcp:write"[^>]*>/.exec(flow.html)?.[0];
  assert.ok(checkbox,'Offer a visible write option when a host starts with only read scope');
  assert.ok(!/\bchecked\b/.test(checkbox),'Additional write permission must require user opt-in');
  const token=await authorizeFlow(flow,['mcp:read','mcp:write']);
  assert.ok(token.scope.split(' ').includes('mcp:write'));
  const denied=await invoke(flow,token,'xingleng_persona_initialize',{confirmed:false,confirmation:'Not approved'});
  assert.equal((await denied.json()).result.isError,true);
  assert.equal(flow.env.BUCKET.writes,0);
  const initialized=await invoke(flow,token,'xingleng_persona_initialize',{confirmed:true,confirmation:'User authorized migration of revisions 1 and 2'});
  const saved=(await initialized.json()).result.structuredContent;
  assert.equal(saved.initialized,true);
  assert.equal(saved.persona_revision,2);
  const read=(await (await invoke(flow,token,'xingleng_persona_read')).json()).result.structuredContent;
  assert.equal(read.source,'cloud_store');
  assert.equal(read.authorization.can_write,true);
  assert.ok(read.authorization.granted_scopes.includes('mcp:write'));
  assert.equal(read.initialized,true);
  assert.equal(read.persona_revision,2);
  assert.equal(flow.env.BUCKET.writes,1);
});
test('authorization discovery publishes an actual browser endpoint and supported read/write scopes',async()=>{
  const flow=await beginFlow(['mcp:read']);
  const response=await flow.send(new Request(base+'/.well-known/oauth-authorization-server'));
  assert.equal(response.status,200);
  const metadata=await response.json();
  assert.equal(metadata.authorization_endpoint,base+'/authorize');
  assert.equal(metadata.token_endpoint,base+'/oauth/token');
  assert.equal(metadata.registration_endpoint,base+'/oauth/register');
  assert.ok(metadata.scopes_supported.includes('mcp:read'));
  assert.ok(metadata.scopes_supported.includes('mcp:write'));
});
