import {callTool,tools} from './store.js';
const json=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store'}});
const writers=new Set(['xingleng_persona_initialize','xingleng_persona_commit']);
export async function apiHandler(request,env,ctx,insufficientScope) {
  const actor=ctx?.props?.githubId;
  if(!actor||actor!==env.ALLOWED_GITHUB_USER_ID)return json({error:'Verified OAuth identity is required'},401);
  const scope=ctx.auth?.scope??[];
  if(!scope.includes('mcp:read'))return insufficientScope(ctx.auth,['mcp:read']);
  const url=new URL(request.url);
  if(request.method==='GET')return new Response(null,{status:405,headers:{Allow:'POST'}});
  if(request.method!=='POST')return json({error:'Use POST'},405);
  const body=await request.text();
  if(new TextEncoder().encode(body).length>65536)return json({error:'Request too large'},413);
  let rpc;
  try{rpc=JSON.parse(body)}catch{return json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}},400)}
  if(!rpc||rpc.jsonrpc!=='2.0'||typeof rpc.method!=='string')return json({jsonrpc:'2.0',id:rpc?.id??null,error:{code:-32600,message:'Invalid Request'}},400);
  if(rpc.id===undefined)return new Response(null,{status:202});
  let result;
  if(rpc.method==='initialize') {
    const supported=['2026-07-28','2025-11-25','2025-06-18','2025-03-26','2024-11-05'];
    result={protocolVersion:supported.includes(rpc.params?.protocolVersion)?rpc.params.protocolVersion:'2026-07-28',serverInfo:{name:'xingleng-persona-memory',version:'1.2.2'},capabilities:{tools:{}}};
  }else if(rpc.method==='server/discover')result={supportedVersions:['2026-07-28'],capabilities:{tools:{}}};
  else if(rpc.method==='ping')result={};
  else if(rpc.method==='tools/list')result={tools};
  else if(rpc.method==='tools/call'){
    if(writers.has(rpc.params?.name)&&!scope.includes('mcp:write'))return insufficientScope(ctx.auth,['mcp:read','mcp:write']);
    try{
      const data=await callTool(rpc.params?.name,rpc.params?.arguments??{},request,env,'github:'+actor);
      result={content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data};
    }catch(error){
      result={isError:true,content:[{type:'text',text:JSON.stringify({error:{code:error.code??'INTERNAL_ERROR',message:error.code?error.message:'Storage service error; no success is claimed'}})}]};
    }
  }else return json({jsonrpc:'2.0',id:rpc.id,error:{code:-32601,message:'Method not found'}});
  return json({jsonrpc:'2.0',id:rpc.id,result});
}
