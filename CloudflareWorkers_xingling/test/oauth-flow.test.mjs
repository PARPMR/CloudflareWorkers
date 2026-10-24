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
async function beginFlow() {
  const env = {PUBLIC_BASE_URL:base, ALLOWED_GITHUB_USER_ID:'129664964',
    GITHUB_CLIENT_ID:'test-client', GITHUB_CLIENT_SECRET:'test-only', BUCKET:{}, OAUTH_KV:new MemoryKV()};
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
    response_type:'code', scope:'mcp:read mcp:write offline_access', state:'test-client-state',
    code_challenge:challenge, code_challenge_method:'S256'});
  const consent = await send(new Request(url));
  assert.equal(consent.status, 200);
  const html = await consent.text();
  const handle = /name="handle" value="([^"]+)"/.exec(html)?.[1];
  assert.ok(handle);
  const cookie = consent.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  assert.ok(cookie);
  const form = new URLSearchParams({handle, decision:'approve'});
  for (const scope of ['mcp:read','mcp:write','offline_access']) form.append('scope', scope);
  const approve = (cookies=cookie) => send(new Request(url, {method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded', Origin:base, Cookie:cookies}, body:form}));
  return {env, approve, cookie, handle, send, client, verifier};
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

test('real provider completes consent, mocked GitHub identity, token exchange and authenticated MCP discovery', async () => {
  const flow = await beginFlow();
  const approval = await flow.approve();
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
  assert.ok(token.refresh_token);
  const discovery=await flow.send(new Request(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token.access_token},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})}));
  assert.equal(discovery.status,200);
  const tools=(await discovery.json()).result.tools.map(tool=>tool.name);
  assert.ok(tools.includes('xingleng_persona_read'));
  assert.ok(tools.includes('xingleng_persona_commit'));
  const stored=JSON.stringify([...flow.env.OAUTH_KV.data.values()]);
  assert.ok(!stored.includes('test-upstream-token'),'GitHub access token must not be retained');
});
