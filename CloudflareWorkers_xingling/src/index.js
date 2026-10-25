import OAuthProvider,{insufficientScope} from '@cloudflare/workers-oauth-provider';
import {authHandler} from './auth.js';
import {apiHandler} from './api.js';
export function setupReady(env){
  try{
    const base=new URL(env.PUBLIC_BASE_URL);
    return base.protocol==='https:'&&base.pathname==='/'&&!base.search&&!base.hash&&!base.username&&!base.password
      &&!!env.OAUTH_KV&&!!env.BUCKET&&!!env.GITHUB_CLIENT_ID&&!!env.GITHUB_CLIENT_SECRET&&/^\d+$/.test(env.ALLOWED_GITHUB_USER_ID);
  }catch{return false}
}
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/health')return Response.json({service:'xingleng-persona-memory',service_version:'1.2.3',engine_version:'1.2.0',storage_bound:!!env.BUCKET,oauth_configured:setupReady(env)},{headers:{'Cache-Control':'no-store'}});
    if(!setupReady(env))return Response.json({status:'setup_required',message:'Configure OAuth KV, public base URL and GitHub OAuth credentials before connecting. No persona data is exposed.'},{status:503,headers:{'Cache-Control':'no-store'}});
    if(url.origin!==new URL(env.PUBLIC_BASE_URL).origin)return new Response('Use the configured service address.',{status:400});
    const provider=new OAuthProvider({
      apiRoute:'/mcp',
      apiHandler:{fetch:(req,bindings,context)=>apiHandler(req,bindings,context,insufficientScope)},
      defaultHandler:{fetch:(req,bindings)=>authHandler(req,bindings)},
      authorizeEndpoint:'/authorize',tokenEndpoint:'/oauth/token',
      clientRegistrationEndpoint:'/oauth/register',
      scopesSupported:['mcp:read','mcp:write','offline_access'],requiredScopes:['mcp:read'],
      allowPlainPKCE:false,clientIdMetadataDocumentEnabled:true,
      resourceMetadata:{resource:env.PUBLIC_BASE_URL+'/mcp',authorization_servers:[env.PUBLIC_BASE_URL]}
    });
    return provider.fetch(request,env,ctx);
  }
};

