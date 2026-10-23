const escape=x=>String(x??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const plain=(message,status=400)=>new Response(message,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
const redirect=(location,headers=new Headers())=>{
  headers.set('Location',location);return new Response(null,{status:302,headers});
};
function consent(details,handle) {
  const scopes=details.scope.map(s=>'<label><input type="checkbox" name="scope" value="'+escape(s)+'" checked> '+escape(s)+'</label><br>').join('');
  return '<!doctype html><meta charset="utf-8"><title>星棱人格库授权</title><h1>授权访问星棱人格库</h1><p>客户端：'+escape(details.clientName)+'</p><p>客户端来源：'+escape(details.clientDomain||'自行注册的客户端，名称未经验证')+'</p><p>授权返回地址：'+escape(details.redirectHost)+'</p>'+(details.redirectIsLoopback?'<p>此授权将返回本机应用，请确认是你刚发起的连接。</p>':'')+'<p>读取：查看长期设定。写入：在你逐项明确确认后保存或回滚。此授权不替代每条设定的确认。</p><form method="post"><input type="hidden" name="handle" value="'+escape(handle)+'">'+scopes+'<button name="decision" value="approve">同意并用 GitHub 登录</button> <button name="decision" value="deny">拒绝</button></form>';
}
async function s256(value) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export async function authHandler(request,env,fetcher=fetch) {
  const url=new URL(request.url),base=new URL(env.PUBLIC_BASE_URL);
  if(url.origin!==base.origin)return plain('Use the configured service address.',400);
  const oauth=env.OAUTH_PROVIDER;
  try {
    if(url.pathname==='/authorize'&&request.method==='GET') {
      const info=await oauth.parseAuthRequest(request);
      const details=await oauth.describeConsent(info);
      const flow=await oauth.beginConsent(info);
      flow.headers.set('Content-Type','text/html; charset=utf-8');
      flow.headers.set('Content-Security-Policy',"default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
      return new Response(consent(details,flow.handle),{headers:flow.headers});
    }
    if(url.pathname==='/authorize'&&request.method==='POST') {
      if(request.headers.get('Origin') && request.headers.get('Origin')!==base.origin)return plain('Invalid request origin.',403);
      const form=await request.formData(),handle=String(form.get('handle')??'');
      if(form.get('decision')!=='approve') {
        const denied=await oauth.denyConsent(request,handle);
        return new Response(null,{status:302,headers:denied.headers});
      }
      const scope=form.getAll('scope').map(String);
      if(!scope.includes('mcp:read')||scope.some(x=>!['mcp:read','mcp:write','offline_access'].includes(x)))return plain('Select supported permissions.');
      const approved=await oauth.approveConsent(request,handle,{scope});
      const verifier=crypto.randomUUID()+crypto.randomUUID();
      const upstream=await oauth.beginUpstream(approved.request,{data:{verifier},headers:approved.headers});
      const github=new URL('https://github.com/login/oauth/authorize');
      github.search=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:base.origin+'/callback',scope:'read:user',state:upstream.state,code_challenge:await s256(verifier),code_challenge_method:'S256'}).toString();
      return redirect(github.href,upstream.headers);
    }
    if(url.pathname==='/callback'&&request.method==='GET') {
      const flow=await oauth.finishUpstream(request);
      if(url.searchParams.has('error'))return plain('GitHub login was cancelled. Start connecting again.',400);
      const code=url.searchParams.get('code');
      if(!code||typeof flow.data?.verifier!=='string')return plain('Login information is incomplete.');
      const tokenResponse=await fetcher('https://github.com/login/oauth/access_token',{
        method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
        body:new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,redirect_uri:base.origin+'/callback',code,code_verifier:flow.data.verifier})
      });
      if(!tokenResponse.ok)return plain('GitHub login is temporarily unavailable.',502);
      const token=await tokenResponse.json();
      if(typeof token.access_token!=='string')return plain('GitHub login failed.',401);
      const userResponse=await fetcher('https://api.github.com/user',{headers:{Authorization:'Bearer '+token.access_token,Accept:'application/vnd.github+json','User-Agent':'xingleng-persona-memory'}});
      if(!userResponse.ok)return plain('Could not verify GitHub identity.',502);
      const user=await userResponse.json();
      if(!Number.isSafeInteger(user.id)||String(user.id)!==env.ALLOWED_GITHUB_USER_ID)return plain('This private persona library is not authorized for this GitHub account.',403);
      const done=await oauth.completeAuthorization({request:flow.request,userId:String(user.id),metadata:{label:'星棱人格库'},scope:flow.request.scope,props:{githubId:String(user.id),login:String(user.login)}});
      return redirect(done.redirectTo,flow.headers);
    }
    if(url.pathname==='/')return new Response('<!doctype html><meta charset="utf-8"><title>星棱人格库</title><h1>✦ 星棱人格库</h1><p>通过 MCP 客户端连接本服务的 /mcp 地址，并完成 GitHub 登录。</p><p>长期设定独立修订；临时适应留在当前聊天。</p>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    return plain('Not found',404);
  } catch {
    // Never log access tokens, state handles or raw authorization requests.
    return plain('Authorization failed or expired. Please start connecting again.',400);
  }
}
