import {readFile,writeFile} from 'node:fs/promises';
const p='wrangler.jsonc';const config=JSON.parse(await readFile(p,'utf8'));
const args=process.argv.slice(2);
for(let n=0;n<args.length;n+=2){
  const [flag,value]=args.slice(n,n+2);
  if(flag==='--base-url'){
    const u=new URL(value);
    if(u.protocol!=='https:'||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('Supply only your https Worker origin.');
    config.vars.PUBLIC_BASE_URL=u.origin;
  }else if(flag==='--oauth-kv-id'){
    if(!/^[a-f0-9]{32}$/.test(value))throw Error('Supply the actual OAuth KV namespace ID.');
    config.kv_namespaces=[{binding:'OAUTH_KV',id:value}];
  }else throw Error('Use --base-url URL and/or --oauth-kv-id ID.');
}
await writeFile(p,JSON.stringify(config,null,2)+'\n');
console.log('Cloudflare configuration updated; no secrets were written.');
