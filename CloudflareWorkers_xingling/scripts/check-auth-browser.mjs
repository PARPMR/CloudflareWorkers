import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
registerHooks({resolve(specifier,context,next){
  if(specifier==='cloudflare:workers')return{url:'data:text/javascript,export class WorkerEntrypoint {}',shortCircuit:true};
  return next(specifier,context);
}});
globalThis.Cloudflare={compatibilityFlags:{global_fetch_strictly_public:true}};
const {default:worker}=await import('../src/index.js');
class MemoryKV {
  data=new Map();
  async get(key,options){const value=this.data.get(key)??null;return (options==='json'||options?.type==='json')&&value!==null?JSON.parse(value):value;}
  async put(key,value){this.data.set(key,value);}
  async delete(key){this.data.delete(key);}
}
const base='https://persona.example';
const env={PUBLIC_BASE_URL:base,ALLOWED_GITHUB_USER_ID:'129664964',GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-only',BUCKET:{},OAUTH_KV:new MemoryKV()};
const send=request=>worker.fetch(request,env,{waitUntil(){}});
await mkdir(resolve('.wrangler'),{recursive:true});
const profile=await mkdtemp(join(resolve('.wrangler'),'auth-browser-'));
const executable=process.env.XINGLENG_TEST_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
let launchError;
browser.on('error',error=>{launchError=error;});
try {
  let connection;
  for(let n=0;n<150;n++){
    if(launchError)throw launchError;
    try{connection=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split(/\r?\n/);break;}catch{}
    await delay(100);
  }
  assert.ok(connection,'Headless browser did not expose its isolated debugging port');
  socket=new WebSocket('ws://127.0.0.1:'+connection[0]+connection[1]);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let nextId=0;
  const pending=new Map(),listeners=new Set();
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){const promise=pending.get(message.id);pending.delete(message.id);if(message.error)promise?.reject(Error(message.error.message));else promise?.resolve(message.result);}
    else for(const listener of listeners)Promise.resolve(listener(message)).catch(error=>{console.error('Browser check failed:',error.message);});
  });
  const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
    const id=++nextId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...sessionId?{sessionId}:{}}));
  });
  for(const decision of ['approve','deny']){
    const registration=await send(new Request(base+'/oauth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_name:'Browser regression client',redirect_uris:['https://client.example/callback'],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none'})}));
    assert.equal(registration.status,201);
    const client=await registration.json();
    const url=new URL(base+'/authorize');
    url.search=new URLSearchParams({client_id:client.client_id,redirect_uri:'https://client.example/callback',response_type:'code',scope:'mcp:read mcp:write offline_access',state:'browser-test-only',code_challenge:'x'.repeat(43),code_challenge_method:'S256'});
    const {targetId}=await call('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    const result={decision,cookieStored:false,postHasCookie:false,postStatus:null,postError:null,redirectReached:false,cspBlocked:false,errors:[]};
    let loaded=false;
    const listener=async message=>{
      if(message.sessionId!==sessionId)return;
      if(message.method==='Page.loadEventFired')loaded=true;
      if(message.method==='Log.entryAdded'&&/Content Security Policy|form-action/.test(message.params.entry.text))result.cspBlocked=true;
      if(message.method!=='Fetch.requestPaused')return;
      const {requestId,request}=message.params;
      const parsed=new URL(request.url);
      try{
        let response;
        if(parsed.origin===base){
          if(request.method==='POST')result.postHasCookie=Object.keys(request.headers).some(name=>name.toLowerCase()==='cookie'&&request.headers[name].includes('__Host-oauth-consent-'));
          response=await send(new Request(request.url,{method:request.method,headers:request.headers,...request.postData?{body:request.postData}:{}}));
          if(request.method==='POST'){result.postStatus=response.status;result.postError=response.headers.get('X-Xingleng-Auth-Error');}
        }else{
          const expected=decision==='approve'?'https://github.com':'https://client.example';
          assert.equal(parsed.origin,expected,'Unexpected navigation destination');
          result.redirectReached=true;
          response=new Response('<!doctype html><title>Local redirect target reached</title>',{headers:{'Content-Type':'text/html'}});
        }
        const headers=[...response.headers].filter(([name])=>name.toLowerCase()!=='set-cookie').map(([name,value])=>({name,value}));
        for(const value of response.headers.getSetCookie())headers.push({name:'Set-Cookie',value});
        await call('Fetch.fulfillRequest',{requestId,responseCode:response.status,responseHeaders:headers,body:Buffer.from(await response.arrayBuffer()).toString('base64')},sessionId);
      }catch(error){result.errors.push(error.message);await call('Fetch.failRequest',{requestId,errorReason:'Failed'},sessionId);}
    };
    listeners.add(listener);
    await call('Page.enable',{},sessionId);
    await call('Runtime.enable',{},sessionId);
    await call('Network.enable',{},sessionId);
    await call('Log.enable',{},sessionId);
    await call('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]},sessionId);
    await call('Page.navigate',{url:url.href},sessionId);
    for(let n=0;n<100&&!loaded;n++)await delay(50);
    assert.ok(loaded,'Consent page did not load');
    const cookies=await call('Network.getCookies',{urls:[base]},sessionId);
    result.cookieStored=cookies.cookies.some(cookie=>cookie.name.startsWith('__Host-oauth-consent-'));
    await call('Runtime.evaluate',{expression:'document.querySelector(\'button[value="'+decision+'"]\').click()'},sessionId);
    for(let n=0;n<100&&!result.redirectReached&&!result.cspBlocked&&!result.postError;n++)await delay(50);
    console.log(JSON.stringify(result));
    listeners.delete(listener);
    await call('Target.closeTarget',{targetId});
    assert.deepEqual(result.errors,[]);
    assert.ok(result.cookieStored,'Browser must accept the secure consent cookie');
    assert.ok(result.postHasCookie,'Browser must send the consent cookie with the form');
    assert.equal(result.cspBlocked,false,'CSP blocked the form redirect');
    assert.ok(result.redirectReached,'Browser did not reach the authorized redirect target');
  }
  await call('Browser.close');
}finally{
  socket?.close();
  browser.kill();
}