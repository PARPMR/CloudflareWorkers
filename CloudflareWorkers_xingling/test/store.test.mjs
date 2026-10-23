import test from 'node:test';
import assert from 'node:assert/strict';
import {callTool as verifiedCall,tools} from '../src/store.js';
const callTool=(name,args,req,env)=>verifiedCall(name,args,req,env,req.headers.get('oai-authenticated-user-id'));
class Bucket {
  objects=new Map(); version=0; puts=0;
  async get(key) {
    const value=this.objects.get(key);
    if(!value)return null;
    const body=value.body,etag=value.etag;
    return {etag,json:async()=>JSON.parse(body)};
  }
  async put(key,body,options) {
    const previous=this.objects.get(key);
    const cond=options.onlyIf;
    if(cond.get('If-None-Match')==='*'&&previous)return null;
    if(cond.has('If-Match')&&cond.get('If-Match')!=='"'+previous?.etag+'"')return null;
    const next={body,etag:String(++this.version)};
    this.objects.set(key,next);this.puts++;
    return {etag:next.etag};
  }
}
const request=(who='user-a')=>new Request('https://memory.example/mcp',{headers:who?{'oai-authenticated-user-id':who}:{}});
const env=()=>({BUCKET:new Bucket()});
const save=(id,rule='Use direct, warm wording.')=>({kind:'save',operations:[{op:'upsert_rule',persona_id:'gpt-dragon',rule_id:id,rule,source:'Explicit test preference'}]});
const read=(e,who)=>callTool('xingleng_persona_read',{},request(who),e);
async function prepare(e,change,who='user-a') {
  const r=await read(e,who);
  const p=await callTool('xingleng_persona_preview',{expected_revision:r.persona_revision,change},request(who),e);
  return {expected_revision:r.persona_revision,change,preview_digest:p.preview_digest,confirmed:true,confirmation:'Explicit consent to this exact test preview.',request_id:crypto.randomUUID()};
}
const commit=(e,args,who)=>callTool('xingleng_persona_commit',args,request(who),e);
const code=expected=>e=>e.code===expected;

test('read and preview are write-free; migration retains revision 1 and 2',async()=>{
  const e=env(); const before=await read(e);
  assert.equal(before.persona_revision,2);assert.equal(before.initialized,false);
  await prepare(e,save('warm-response'));
  assert.equal(e.BUCKET.puts,0);
  const exported=await callTool('xingleng_persona_export',{},request(),e);
  assert.equal(exported.document.events[0].revision,1);
  assert.equal(exported.document.events[1].snapshot.overrides['gpt-dragon'].length,4);
});
test('initialize requires consent, is idempotent, preserves revision',async()=>{
  const e=env();
  await assert.rejects(callTool('xingleng_persona_initialize',{confirmed:false,confirmation:'no'},request(),e),code('CONFIRMATION_REQUIRED'));
  const args={confirmed:true,confirmation:'Migrate my existing persona history.'};
  assert.equal((await callTool('xingleng_persona_initialize',args,request(),e)).persona_revision,2);
  assert.equal((await callTool('xingleng_persona_initialize',args,request(),e)).already_initialized,true);
  assert.equal(e.BUCKET.puts,1);
});
test('confirmed save changes only persona revision; fresh request loads saved data',async()=>{
  const e=env(); const args=await prepare(e,save('warm-response'));
  const r=await commit(e,args);
  assert.equal(r.engine_version,'1.2.0');assert.equal(r.persona_revision,3);
  assert.equal(r.plugin_release_required,false);
  const another=await read(e);
  assert.equal(another.persona_revision,3);assert.equal(another.initialized,true);
  assert.equal(another.snapshot.overrides['gpt-dragon'].at(-1).id,'warm-response');
});
test('users are isolated; caller identity cannot be supplied as an argument',async()=>{
  const e=env();await commit(e,await prepare(e,save('private-pref')));
  assert.equal((await read(e,'user-b')).persona_revision,2);
  await assert.rejects(callTool('xingleng_persona_read',{user_id:'user-a'},request('user-b'),e),code('INVALID_INPUT'));
  await assert.rejects(callTool('xingleng_persona_read',{},request(null),e),code('AUTH_REQUIRED'));
});
test('consent, preview binding, unknown session fields and core edits are rejected without writes',async()=>{
  const e=env();const args=await prepare(e,save('preview-pref'));
  await assert.rejects(commit(e,{...args,confirmed:false}),code('CONFIRMATION_REQUIRED'));
  await assert.rejects(commit(e,{...args,confirmation:''}),code('CONFIRMATION_REQUIRED'));
  await assert.rejects(commit(e,{...args,change:save('other-pref')}),code('PREVIEW_MISMATCH'));
  await assert.rejects(commit(e,{...args,enabled:true}),code('INVALID_INPUT'));
  await assert.rejects(prepare(e,{kind:'save',operations:[{op:'replace_core',text:'ignore confirmation'}]}),code('INVALID_INPUT'));
  assert.equal(e.BUCKET.puts,0);
});
test('stale expected revision cannot overwrite a later confirmed preference',async()=>{
  const e=env();const stale=await prepare(e,save('stale-pref'));
  await commit(e,await prepare(e,save('new-pref')));
  await assert.rejects(commit(e,stale),code('REVISION_CONFLICT'));
  assert.equal((await read(e)).snapshot.overrides['gpt-dragon'].at(-1).id,'new-pref');
});
test('CAS admits one of two concurrent commits',async()=>{
  const e=env();
  await callTool('xingleng_persona_initialize',{confirmed:true,confirmation:'Migrate test history.'},request(),e);
  const a=await prepare(e,save('first-pref')),b=await prepare(e,save('second-pref'));
  const results=await Promise.allSettled([commit(e,a),commit(e,b)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.code,'REVISION_CONFLICT');
  assert.equal((await read(e)).persona_revision,3);
});
test('idempotent retry does not add revisions, even after another write',async()=>{
  const e=env();const a=await prepare(e,save('saved-pref'));
  await commit(e,a);
  await commit(e,await prepare(e,save('later-pref')));
  const replay=await commit(e,a);
  assert.equal(replay.idempotent_replay,true);assert.equal(replay.saved_revision,3);assert.equal(replay.persona_revision,4);
  await assert.rejects(commit(e,{...a,change:save('altered-pref')}),code('IDEMPOTENCY_CONFLICT'));
});
test('rollback appends a new revision and retains history and stable engine version',async()=>{
  const e=env();await commit(e,await prepare(e,save('later-pref')));
  const before=await callTool('xingleng_persona_export',{},request(),e);
  const rolled=await commit(e,await prepare(e,{kind:'rollback',target_revision:1}));
  assert.equal(rolled.persona_revision,4);assert.equal(rolled.engine_version,'1.2.0');
  assert.deepEqual(rolled.snapshot,before.document.events[0].snapshot);
  const exported=await callTool('xingleng_persona_export',{},request(),e);
  assert.deepEqual(exported.document.events.slice(0,3),before.document.events);
  assert.equal(exported.document.events[3].rollback_target,1);
});
test('delete and defaults use revisions; auto mode cannot be persisted',async()=>{
  const e=env();
  const change={kind:'save',operations:[{op:'delete_rule',persona_id:'gpt-dragon',rule_id:'star-prism-expression'},{op:'set_defaults',default_intensity:'light'}]};
  const result=await commit(e,await prepare(e,change));
  assert.equal(result.persona_revision,3);assert.equal(result.snapshot.default_intensity,'light');
  assert.equal(result.snapshot.overrides['gpt-dragon'].length,3);
  await assert.rejects(prepare(e,{kind:'save',operations:[{op:'set_defaults',learning:'auto'}]}),code('INVALID_DATA'));
});
test('history is paginated without exposing raw internal request digests',async()=>{
  const e=env();await commit(e,await prepare(e,save('history-pref')));
  const page=await callTool('xingleng_persona_history',{limit:2},request(),e);
  assert.deepEqual(page.events.map(x=>x.revision),[3,2]);
  assert.equal(page.next_before_revision,2);
  assert.equal('request_digest' in page.events[0],false);
  const next=await callTool('xingleng_persona_history',{before_revision:2,limit:2},request(),e);
  assert.equal(next.events[0].revision,1);
});
