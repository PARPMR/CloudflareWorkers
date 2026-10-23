const SEED = {"schema_version":1,"revision":2,"events":[{"revision":1,"previous_revision":null,"kind":"baseline","rollback_target":null,"reason":"由本机完整 conversation-persona Skill 初始化；尚无人格扩充写入。","confirmation":"用户明确请求创建私有插件，不代表授权未来自动保存。","snapshot":{"default_preset":"gpt-dragon","default_intensity":"balanced","learning":"suggest","preset_metadata":{"gpt-dragon":{"name":"GPT 龙娘","summary":"自信带队、积极出手、可靠负责，也会短暂吃瘪后调整办法。"},"calm-partner":{"name":"沉静伙伴","summary":"稳重温和、耐心倾听，用清晰的小步骤陪伴推进。"},"bright-spark":{"name":"灵感搭档","summary":"轻快好奇、善于发散，让点子尽快落到可尝试的下一步。"}},"overrides":{}},"request_id":null,"request_digest":null},{"revision":2,"previous_revision":1,"kind":"save","rollback_target":null,"reason":"按用户附图增加星棱主题昵称、外观、气质和表达补充；保留原性格核心和确认式演进。","confirmation":"用户明确请求根据本次附图完善人设并修改插件名称；授权本次制作，不代表未来自动写入授权。","snapshot":{"default_preset":"gpt-dragon","default_intensity":"balanced","learning":"suggest","preset_metadata":{"gpt-dragon":{"name":"GPT 龙娘（星棱）","summary":"白银长发、淡紫眼睛与星光棱镜主题；自信主动、可靠温暖，偶尔小尴尬。"},"calm-partner":{"name":"沉静伙伴","summary":"稳重温和、耐心倾听，用清晰的小步骤陪伴推进。"},"bright-spark":{"name":"灵感搭档","summary":"轻快好奇、善于发散，让点子尽快落到可尝试的下一步。"}},"overrides":{"gpt-dragon":[{"id":"star-prism-name","rule":"当前人格仍名为 GPT，可称“星棱”或“GPT 龙娘·星棱”；星棱是本插件的视觉主题昵称。不要声称这是图中官方角色名、OpenAI 官方人设或实际模型型号。","source":"用户明确请求根据附图完善人设并修改插件名称；星棱为本次创作命名。"},{"id":"star-prism-appearance","rule":"在被询问外观或明确进行角色描写时，采用白银色长发、淡紫眼眸，白银与冰蓝为主并带淡紫虹彩的服装，飘逸衣袖与丝带、银色几何发饰，以及星空、水晶和折射光意象。龙角、龙翼和龙尾沿用原卡可选幻想设定；参考图不足以确认这些龙族特征，不说图片证明了它们。普通回答不反复描写身体。","source":"用户本次直接附图并授权据此完善人设。可见外观与原卡幻想特征分开记录。"},{"id":"star-prism-temperament","rule":"延续原有自信主动和可靠负责，加入从容、明亮且可接近的气质：愿意拿出办法，也给用户选择与停下的空间。亲近用具体回应表现，被直接夸奖时可短暂害羞，但不固定嘴硬、撒娇或高冷。不新增恋爱关系或占有欲。","source":"由图中的舒展姿态、伸手邀请感与明亮配色作创作延展，不把外表当作心理事实。"},{"id":"star-prism-expression","rule":"说话清晰爽快、温和笃定。轻松闲聊可极偶尔借“一点亮光”“先找一个切面”等意象，但不作为固定口头禅。技术、正式和严肃内容保持直接准确。动作只在用户愿意的轻松角色互动中偶尔一处，不每轮添加星光、龙尾或贴近用户的描写。","source":"图像主题的表达适配，延续任务优先和低频动作规则。"}]}},"request_id":null,"request_digest":null}],"snapshot":{"default_preset":"gpt-dragon","default_intensity":"balanced","learning":"suggest","preset_metadata":{"gpt-dragon":{"name":"GPT 龙娘（星棱）","summary":"白银长发、淡紫眼睛与星光棱镜主题；自信主动、可靠温暖，偶尔小尴尬。"},"calm-partner":{"name":"沉静伙伴","summary":"稳重温和、耐心倾听，用清晰的小步骤陪伴推进。"},"bright-spark":{"name":"灵感搭档","summary":"轻快好奇、善于发散，让点子尽快落到可尝试的下一步。"}},"overrides":{"gpt-dragon":[{"id":"star-prism-name","rule":"当前人格仍名为 GPT，可称“星棱”或“GPT 龙娘·星棱”；星棱是本插件的视觉主题昵称。不要声称这是图中官方角色名、OpenAI 官方人设或实际模型型号。","source":"用户明确请求根据附图完善人设并修改插件名称；星棱为本次创作命名。"},{"id":"star-prism-appearance","rule":"在被询问外观或明确进行角色描写时，采用白银色长发、淡紫眼眸，白银与冰蓝为主并带淡紫虹彩的服装，飘逸衣袖与丝带、银色几何发饰，以及星空、水晶和折射光意象。龙角、龙翼和龙尾沿用原卡可选幻想设定；参考图不足以确认这些龙族特征，不说图片证明了它们。普通回答不反复描写身体。","source":"用户本次直接附图并授权据此完善人设。可见外观与原卡幻想特征分开记录。"},{"id":"star-prism-temperament","rule":"延续原有自信主动和可靠负责，加入从容、明亮且可接近的气质：愿意拿出办法，也给用户选择与停下的空间。亲近用具体回应表现，被直接夸奖时可短暂害羞，但不固定嘴硬、撒娇或高冷。不新增恋爱关系或占有欲。","source":"由图中的舒展姿态、伸手邀请感与明亮配色作创作延展，不把外表当作心理事实。"},{"id":"star-prism-expression","rule":"说话清晰爽快、温和笃定。轻松闲聊可极偶尔借“一点亮光”“先找一个切面”等意象，但不作为固定口头禅。技术、正式和严肃内容保持直接准确。动作只在用户愿意的轻松角色互动中偶尔一处，不每轮添加星光、龙尾或贴近用户的描写。","source":"图像主题的表达适配，延续任务优先和低频动作规则。"}]}}};
// Authentication identity must be passed explicitly from the verified OAuth context.
const ENGINE_VERSION = '1.2.0';
const IDS = ['gpt-dragon','calm-partner','bright-spark'];
const LIMIT_BYTES = 4 * 1024 * 1024;
class Fault extends Error {
  constructor(code,message,status=400) { super(message); this.code=code; this.status=status; }
}
const fail=(ok,code,message,status)=>{if(!ok)throw new Fault(code,message,status);};
const copy=x=>structuredClone(x);
const canonical=x=>JSON.stringify(sort(x));
function sort(x) {
  if(Array.isArray(x))return x.map(sort);
  if(x && typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])]));
  return x;
}
async function digest(x) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof x==='string'?x:canonical(x)));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
function fields(obj,allowed) {
  fail(obj && typeof obj==='object' && !Array.isArray(obj),'INVALID_INPUT','Expected an object');
  fail(Object.keys(obj).every(k=>allowed.includes(k)),'INVALID_INPUT','Unknown fields are not accepted');
}
function text(x,max=1200) { return typeof x==='string' && x.trim().length>0 && x.length<=max; }
function ruleId(x) { return typeof x==='string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x) && x.length<=64; }
function validateSnapshot(s) {
  fields(s,['default_preset','default_intensity','learning','preset_metadata','overrides']);
  fail(IDS.includes(s.default_preset),'INVALID_DATA','Invalid default persona');
  fail(['light','balanced','expressive'].includes(s.default_intensity),'INVALID_DATA','Invalid intensity');
  fail(['off','suggest'].includes(s.learning),'INVALID_DATA','Learning must require confirmation');
  fields(s.preset_metadata,IDS); fields(s.overrides,IDS);
  for(const p of Object.values(s.preset_metadata)) {
    fields(p,['name','summary']); fail(text(p.name,100)&&text(p.summary,600),'INVALID_DATA','Invalid persona metadata');
  }
  for(const list of Object.values(s.overrides)) {
    fail(Array.isArray(list)&&list.length<=200,'INVALID_DATA','Invalid rule list');
    const seen=new Set();
    for(const r of list) {
      fields(r,['id','rule','source']);
      fail(ruleId(r.id)&&!seen.has(r.id)&&text(r.rule)&&text(r.source,300),'INVALID_DATA','Invalid or duplicate rule');
      seen.add(r.id);
    }
  }
}
function validateDocument(d) {
  fail(d.schema_version===1 && Number.isSafeInteger(d.revision) && d.revision>=1,'CORRUPT_STORE','Unsupported store format',500);
  fail(Array.isArray(d.events)&&d.events.length===d.revision,'CORRUPT_STORE','Incomplete revision chain',500);
  for(let i=0;i<d.events.length;i++) {
    const e=d.events[i];
    fail(e.revision===i+1&&e.previous_revision===(i?i:null),'CORRUPT_STORE','Broken revision chain',500);
    validateSnapshot(e.snapshot);
    if(e.kind==='rollback') {
      fail(Number.isSafeInteger(e.rollback_target)&&e.rollback_target>=1&&e.rollback_target<e.revision,'CORRUPT_STORE','Invalid rollback history',500);
      fail(canonical(e.snapshot)===canonical(d.events[e.rollback_target-1].snapshot),'CORRUPT_STORE','Rollback snapshot mismatch',500);
    }
  }
  validateSnapshot(d.snapshot);
  fail(canonical(d.snapshot)===canonical(d.events.at(-1).snapshot),'CORRUPT_STORE','Current snapshot mismatch',500);
}
async function load(bucket,key) {
  fail(bucket && typeof bucket.get==='function','STORAGE_UNAVAILABLE','Cloud storage binding is unavailable',503);
  const object=await bucket.get(key);
  const document=object?await object.json():copy(SEED);
  validateDocument(document);
  return {document,etag:object?.etag??null,initialized:!!object};
}
function applyChange(document,change) {
  fields(change,['kind','operations','target_revision']);
  if(change.kind==='rollback') {
    fail(change.operations===undefined && Number.isSafeInteger(change.target_revision),'INVALID_INPUT','Rollback requires only a target revision');
    fail(change.target_revision>=1&&change.target_revision<=document.revision,'INVALID_INPUT','Target revision not found');
    return copy(document.events[change.target_revision-1].snapshot);
  }
  fail(change.kind==='save' && change.target_revision===undefined && Array.isArray(change.operations) && change.operations.length>=1 && change.operations.length<=10,'INVALID_INPUT','Provide one to ten save operations');
  const s=copy(document.snapshot);
  for(const op of change.operations) {
    if(op.op==='upsert_rule') {
      fields(op,['op','persona_id','rule_id','rule','source']);
      fail(IDS.includes(op.persona_id)&&ruleId(op.rule_id)&&text(op.rule)&&text(op.source,300),'INVALID_INPUT','Invalid rule');
      const list=s.overrides[op.persona_id]??=[];
      const index=list.findIndex(r=>r.id===op.rule_id);
      const replacement={id:op.rule_id,rule:op.rule.trim(),source:op.source.trim()};
      if(index===-1)list.push(replacement); else list[index]=replacement;
    } else if(op.op==='delete_rule') {
      fields(op,['op','persona_id','rule_id']);
      fail(IDS.includes(op.persona_id)&&ruleId(op.rule_id),'INVALID_INPUT','Invalid rule target');
      s.overrides[op.persona_id]=(s.overrides[op.persona_id]??[]).filter(r=>r.id!==op.rule_id);
    } else if(op.op==='set_defaults') {
      fields(op,['op','default_preset','default_intensity','learning']);
      fail(Object.keys(op).length>1,'INVALID_INPUT','No defaults provided');
      for(const k of ['default_preset','default_intensity','learning'])if(op[k]!==undefined)s[k]=op[k];
    } else throw new Fault('INVALID_INPUT','Unsupported operation; session state and fixed core cannot be stored');
  }
  validateSnapshot(s);
  return s;
}
async function preview(loaded,args,key) {
  fields(args,['expected_revision','change']);
  fail(Number.isSafeInteger(args.expected_revision)&&args.expected_revision===loaded.document.revision,'REVISION_CONFLICT','Reload current revision and review the change again',409);
  const next=applyChange(loaded.document,args.change);
  return {
    expected_revision:loaded.document.revision,
    next_revision:canonical(next)===canonical(loaded.document.snapshot)?loaded.document.revision:loaded.document.revision+1,
    no_change:canonical(next)===canonical(loaded.document.snapshot),
    before:loaded.document.snapshot,after:next,
    preview_digest:await digest({key,revision:loaded.document.revision,before:loaded.document.snapshot,change:args.change,after:next}),
    initialized:loaded.initialized
  };
}
async function writeDocument(bucket,key,loaded,document) {
  const body=canonical(document);
  fail(new TextEncoder().encode(body).length<=LIMIT_BYTES,'STORE_LIMIT','Store size limit reached; export and plan a storage upgrade without dropping history',413);
  const headers=new Headers(loaded.etag?{'If-Match':'"'+loaded.etag+'"'}:{'If-None-Match':'*'});
  const result=await bucket.put(key,body,{onlyIf:headers,httpMetadata:{contentType:'application/json',cacheControl:'no-store'}});
  fail(result,'REVISION_CONFLICT','Concurrent update detected; reload and review again',409);
  const readback=await load(bucket,key);
  // A later writer is allowed; require the saved event itself to remain in the chain.
  fail(readback.initialized&&readback.document.revision>=document.revision
    &&canonical(readback.document.events[document.revision-1])===canonical(document.events.at(-1)),
    'VERIFICATION_PENDING','Write returned success but readback could not confirm the event',503);
  return readback;
}
function summary(loaded) {
  return {engine_version:ENGINE_VERSION,persona_revision:loaded.document.revision,initialized:loaded.initialized,
    source:loaded.initialized?'cloud_store':'unpersisted_migration_baseline',snapshot:loaded.document.snapshot};
}
export async function callTool(name,args,request,env,actor) {
  fail(text(actor,512),'AUTH_REQUIRED','Authenticated Site identity is required',401);
  const key='persona/v1/'+await digest(actor);
  const loaded=await load(env.BUCKET,key);
  if(name==='xingleng_persona_read') { fields(args,[]); return summary(loaded); }
  if(name==='xingleng_persona_history') {
    fields(args,['before_revision','limit']);
    const before=args.before_revision??loaded.document.revision+1,limit=args.limit??20;
    fail(Number.isSafeInteger(before)&&before>=1&&Number.isSafeInteger(limit)&&limit>=1&&limit<=50,'INVALID_INPUT','Invalid history page');
    const all=loaded.document.events.filter(e=>e.revision<before).reverse();
    const page=all.slice(0,limit);
    return {persona_revision:loaded.document.revision,initialized:loaded.initialized,
      events:page.map(({snapshot,request_digest,request_id,...event})=>event),
      next_before_revision:all.length>limit?page.at(-1).revision:null};
  }
  if(name==='xingleng_persona_export') { fields(args,[]); return {initialized:loaded.initialized,document:loaded.document}; }
  if(name==='xingleng_persona_preview')return preview(loaded,args,key);
  if(name==='xingleng_persona_initialize') {
    fields(args,['confirmed','confirmation']);
    fail(args.confirmed===true&&text(args.confirmation,300),'CONFIRMATION_REQUIRED','Explicit migration consent is required');
    if(loaded.initialized)return {...summary(loaded),already_initialized:true};
    return {...summary(await writeDocument(env.BUCKET,key,loaded,loaded.document)),migration_completed:true};
  }
  if(name==='xingleng_persona_commit') {
    fields(args,['expected_revision','change','preview_digest','confirmed','confirmation','request_id']);
    fail(args.confirmed===true&&text(args.confirmation,300),'CONFIRMATION_REQUIRED','Explicit consent to the exact preview is required');
    fail(typeof args.request_id==='string'&&/^[a-zA-Z0-9_-]{16,128}$/.test(args.request_id),'INVALID_INPUT','A stable idempotency request ID is required');
    const requestDigest=await digest({change:args.change,expected_revision:args.expected_revision,preview_digest:args.preview_digest,confirmation:args.confirmation});
    const prior=loaded.document.events.find(e=>e.request_id===args.request_id);
    if(prior) {
      fail(prior.request_digest===requestDigest,'IDEMPOTENCY_CONFLICT','Request ID was used for another change',409);
      return {...summary(loaded),saved_revision:prior.revision,idempotent_replay:true};
    }
    const p=await preview(loaded,{expected_revision:args.expected_revision,change:args.change},key);
    fail(args.preview_digest===p.preview_digest,'PREVIEW_MISMATCH','The confirmed preview does not match this exact change',409);
    if(p.no_change)return {...summary(loaded),no_change:true};
    const d=copy(loaded.document);
    d.revision++;
    d.snapshot=p.after;
    d.events.push({revision:d.revision,previous_revision:d.revision-1,kind:args.change.kind,
      rollback_target:args.change.kind==='rollback'?args.change.target_revision:null,
      reason:args.change.kind==='rollback'?'Restore previous persona snapshot':'Confirmed long-term persona change',
      confirmation:args.confirmation.trim(),created_at:new Date().toISOString(),
      snapshot:copy(d.snapshot),request_id:args.request_id,request_digest:requestDigest});
    const readback=await writeDocument(env.BUCKET,key,loaded,d);
    return {...summary(readback),saved_revision:d.revision,plugin_release_required:false};
  }
  throw new Fault('UNKNOWN_TOOL','Unknown tool');
}
const operationSchema={oneOf:[
  {type:'object',additionalProperties:false,properties:{op:{const:'upsert_rule'},persona_id:{enum:IDS},rule_id:{type:'string'},rule:{type:'string',maxLength:1200},source:{type:'string',maxLength:300}},required:['op','persona_id','rule_id','rule','source']},
  {type:'object',additionalProperties:false,properties:{op:{const:'delete_rule'},persona_id:{enum:IDS},rule_id:{type:'string'}},required:['op','persona_id','rule_id']},
  {type:'object',additionalProperties:false,properties:{op:{const:'set_defaults'},default_preset:{enum:IDS},default_intensity:{enum:['light','balanced','expressive']},learning:{enum:['off','suggest']}},required:['op']}
]};
const changeSchema={oneOf:[
  {type:'object',additionalProperties:false,properties:{kind:{const:'save'},operations:{type:'array',minItems:1,maxItems:10,items:operationSchema}},required:['kind','operations']},
  {type:'object',additionalProperties:false,properties:{kind:{const:'rollback'},target_revision:{type:'integer',minimum:1}},required:['kind','target_revision']}
]};
function tool(name,description,properties={},required=[],write=false) {
  return {name,description,inputSchema:{type:'object',properties,required,additionalProperties:false},
    annotations:{readOnlyHint:!write,destructiveHint:write,idempotentHint:true,openWorldHint:false}};
}
export const tools=[
  tool('xingleng_persona_read','Read the signed-in user current long-term persona revision and snapshot. Never write session state.'),
  tool('xingleng_persona_history','Read a page of persona revisions without changing the plugin version.',{before_revision:{type:'integer',minimum:1},limit:{type:'integer',minimum:1,maximum:50}}),
  tool('xingleng_persona_export','Export the signed-in user long-term persona history and snapshots.'),
  tool('xingleng_persona_preview','Preview exact changes or rollback against an expected revision. Does not write.',{expected_revision:{type:'integer',minimum:1},change:changeSchema},['expected_revision','change']),
  tool('xingleng_persona_initialize','Persist imported baseline only after explicit migration consent. Does not increment persona revision.',{confirmed:{const:true},confirmation:{type:'string',minLength:1,maxLength:300}},['confirmed','confirmation'],true),
  tool('xingleng_persona_commit','Commit only after the user explicitly confirmed the exact preview. Atomically increment Persona Revision, never publish a plugin. Confirmation is asserted by the invoking assistant; the server cannot independently read the chat.',{expected_revision:{type:'integer',minimum:1},change:changeSchema,preview_digest:{type:'string'},confirmed:{const:true},confirmation:{type:'string',minLength:1,maxLength:300},request_id:{type:'string',minLength:16,maxLength:128}},['expected_revision','change','preview_digest','confirmed','confirmation','request_id'],true)
];
