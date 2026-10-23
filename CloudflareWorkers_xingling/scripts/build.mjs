import {readFile} from 'node:fs/promises';
const c=JSON.parse(await readFile('wrangler.jsonc','utf8'));
if(!/^[a-f0-9]{32}$/.test(c.account_id))throw Error('Invalid Cloudflare account ID.');
if(c.name!=='xingleng-persona-memory'||c.main!=='src/index.js')throw Error('Unexpected deployment target.');
if(c.r2_buckets?.[0]?.binding!=='BUCKET'||c.r2_buckets?.[0]?.bucket_name!=='xingleng-persona-memory')throw Error('Unexpected R2 binding.');
for(const p of ['src/index.js','src/auth.js','src/api.js','src/store.js'])await readFile(p,'utf8');
console.log('Deployment configuration validated. Wrangler bundles the JavaScript entrypoint.');
if(!c.vars.PUBLIC_BASE_URL||!c.kv_namespaces?.length)console.log('Initial deployment is setup-only; add the actual Worker URL and OAuth KV ID before connecting.');
