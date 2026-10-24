const escape=x=>String(x??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const plain=(message,status=400)=>new Response(message,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
const redirect=(location,headers=new Headers())=>{
  headers.set('Location',location);return new Response(null,{status:302,headers});
};
function consent(details,handle) {
  const scopes=details.scope.map(s=>'<label><input type="checkbox" name="scope" value="'+escape(s)+'" checked> '+escape(s)+'</label><br>').join('');
  return '<!doctype html><meta charset="utf-8"><title>星棱人格库授权</title><h1>授权访问星棱人格库</h1><p>客户端：'+escape(details.clientName)+'</p><p>客户端来源：'+escape(details.clientDomain||'自行注册的客户端，名称未经验证')+'</p><p>授权返回地址：'+escape(details.redirectHost)+'</p>'+(details.redirectIsLoopback?'<p>此授权将返回本机应用，请确认是你刚发起的连接。</p>':'')+'<p>读取：查看长期设定。写入：在你逐项明确确认后保存或回滚。此授权不替代每条设定的确认。</p><form method="post"><input type="hidden" name="handle" value="'+escape(handle)+'">'+scopes+'<button name="decision" value="approve">同意并用 GitHub 登录</button> <button name="decision" value="deny">拒绝</button></form>';
}
function consentPolicy(redirectUri) {
  // Chromium also applies form-action to redirects after the POST. The callback
  // comes from the library-validated request, never from client display metadata.
  const callback=new URL(redirectUri);
  const callbackSource=callback.origin==='null'?callback.protocol:callback.origin;
  if(/[\s;'"]/.test(callbackSource))throw new TypeError('Invalid callback CSP source');
  const destinations=[...new Set(["'self'",'https://github.com',callbackSource])];
  return "default-src 'none'; form-action "+destinations.join(' ')+"; frame-ancestors 'none'; base-uri 'none'";
}
async function s256(value) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function authorizationFailure(stage,error) {
  const known=new Map([
    ['This authorization was not started in this browser; start again','AUTH_BROWSER_COOKIE_MISSING'],
    ['This authorization belongs to a different browser session; start again','AUTH_BROWSER_COOKIE_MISMATCH'],
    ['This authorization expired or was already used; start again','AUTH_TRANSACTION_EXPIRED'],
    ['Missing transaction handle','AUTH_HANDLE_MISSING'],
    ['Missing state parameter','AUTH_STATE_MISSING'],
    ['Approved scopes must be ones this server supports','AUTH_SCOPE_INVALID']
  ]);
  const code=(error?.name==='AuthorizationError' && known.get(error.message))
    || (error?.name==='AuthorizationError'?'AUTH_REQUEST_REJECTED':'AUTH_SERVICE_ERROR');
  const advice=code==='AUTH_BROWSER_COOKIE_MISSING'||code==='AUTH_BROWSER_COOKIE_MISMATCH'
    ? 'Please restart the connection and complete it in the same browser window with cookies enabled for this site.'
    : code==='AUTH_SERVICE_ERROR'
      ? 'The service could not complete authorization. Share only this error code and stage for diagnosis.'
      : 'Start a fresh connection from the plugin; do not resubmit an old authorization page.';
  // Deliberately log only fixed labels: never the exception, URL, cookie, handle, code or state values.
  console.warn(JSON.stringify({event:'xingleng_authorization_failed',stage,error_code:code}));
  const response=plain('Authorization failed or expired. Please start connecting again.\nError code: '+code+'\nStage: '+stage+'\n'+advice,code==='AUTH_SERVICE_ERROR'?503:400);
  response.headers.set('X-Xingleng-Auth-Error',code);
  response.headers.set('X-Xingleng-Auth-Stage',stage);
  return response;
}
export async function authHandler(request,env,fetcher=fetch) {
  const url=new URL(request.url),base=new URL(env.PUBLIC_BASE_URL);
  if(url.origin!==base.origin)return plain('Use the configured service address.',400);
  const oauth=env.OAUTH_PROVIDER;
  let stage='authorize_route';
  try {
    if(url.pathname==='/authorize'&&request.method==='GET') {
      stage='authorize_parse';
      const info=await oauth.parseAuthRequest(request);
      stage='consent_describe';
      const details=await oauth.describeConsent(info);
      stage='consent_begin';
      const flow=await oauth.beginConsent(info);
      flow.headers.set('Content-Type','text/html; charset=utf-8');
      flow.headers.set('Content-Security-Policy',consentPolicy(info.redirectUri));
      return new Response(consent(details,flow.handle),{headers:flow.headers});
    }
    if(url.pathname==='/authorize'&&request.method==='POST') {
      if(request.headers.get('Origin') && request.headers.get('Origin')!==base.origin)return plain('Invalid request origin.',403);
      stage='consent_form';
      const form=await request.formData(),handle=String(form.get('handle')??'');
      if(form.get('decision')!=='approve') {
        stage='consent_deny';
        const denied=await oauth.denyConsent(request,handle);
        return new Response(null,{status:302,headers:denied.headers});
      }
      const scope=form.getAll('scope').map(String);
      if(!scope.includes('mcp:read')||scope.some(x=>!['mcp:read','mcp:write','offline_access'].includes(x)))return plain('Select supported permissions.');
      stage='consent_approve';
      const approved=await oauth.approveConsent(request,handle,{scope});
      const verifier=crypto.randomUUID()+crypto.randomUUID();
      stage='upstream_begin';
      const upstream=await oauth.beginUpstream(approved.request,{data:{verifier},headers:approved.headers});
      stage='github_redirect';
      const github=new URL('https://github.com/login/oauth/authorize');
      github.search=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:base.origin+'/callback',scope:'read:user',state:upstream.state,code_challenge:await s256(verifier),code_challenge_method:'S256'}).toString();
      return redirect(github.href,upstream.headers);
    }
    if(url.pathname==='/callback'&&request.method==='GET') {
      stage='upstream_resume';
      const flow=await oauth.finishUpstream(request);
      if(url.searchParams.has('error'))return plain('GitHub login was cancelled. Start connecting again.',400);
      const code=url.searchParams.get('code');
      if(!code||typeof flow.data?.verifier!=='string')return plain('Login information is incomplete.');
      stage='github_exchange';
      const tokenResponse=await fetcher('https://github.com/login/oauth/access_token',{
        method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
        body:new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,redirect_uri:base.origin+'/callback',code,code_verifier:flow.data.verifier})
      });
      if(!tokenResponse.ok)return plain('GitHub login is temporarily unavailable.',502);
      const token=await tokenResponse.json();
      if(typeof token.access_token!=='string')return plain('GitHub login failed.',401);
      stage='github_identity';
      const userResponse=await fetcher('https://api.github.com/user',{headers:{Authorization:'Bearer '+token.access_token,Accept:'application/vnd.github+json','User-Agent':'xingleng-persona-memory'}});
      if(!userResponse.ok)return plain('Could not verify GitHub identity.',502);
      const user=await userResponse.json();
      if(!Number.isSafeInteger(user.id)||String(user.id)!==env.ALLOWED_GITHUB_USER_ID)return plain('This private persona library is not authorized for this GitHub account.',403);
      stage='authorization_complete';
      const done=await oauth.completeAuthorization({request:flow.request,userId:String(user.id),metadata:{label:'星棱人格库'},scope:flow.request.scope,props:{githubId:String(user.id),login:String(user.login)}});
      return redirect(done.redirectTo,flow.headers);
    }
    if(url.pathname==='/')return new Response('<!doctype html><meta charset="utf-8"><title>星棱人格库</title><h1>✦ 星棱人格库</h1><p>通过 MCP 客户端连接本服务的 /mcp 地址，并完成 GitHub 登录。</p><p>长期设定独立修订；临时适应留在当前聊天。</p>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    return plain('Not found',404);
  } catch(error) {
    return authorizationFailure(stage,error);
  }
}
