import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../worker/index.js',import.meta.url),'utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
function environment(){let object=null,revision=0,serial=Promise.resolve();return {IDEA_SYNC_SECRET:'test-only-secret',BUCKET:{async get(){return object?{etag:String(revision),json:async()=>JSON.parse(object)}:null;},put(key,value,options={}){const task=serial.then(()=>{if(options.onlyIf?.etagMatches&&options.onlyIf.etagMatches!==String(revision))return null;if(options.onlyIf?.etagDoesNotMatch==='*'&&object)return null;object=value;revision++;return {etag:String(revision)};});serial=task.catch(()=>{});return task;}}};}
function request(path,method='GET',body,headers={},identity=true){return new Request('https://board.example'+path,{method,headers:{...(identity?{'oai-authenticated-user-id':'test-user'}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});}
const event=(extra={})=>({id:'my-project',eventId:crypto.randomUUID(),observedAt:new Date().toISOString(),status:'research',progress:'Compared approaches; prototype validation is next.',evidence:'Reviewed documentation and requirements.',...extra});
const sync=(env,body)=>worker.fetch(request('/api/sync','POST',body,{'X-Idea-Sync-Key':'test-only-secret'},false),env);
const state=async env=>(await worker.fetch(request('/api/ideas'),env)).json();
const mcp=async(env,name,args={})=>(await worker.fetch(request('/mcp','POST',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}}),env)).json();

test('new owner board starts empty and no author project catalog is bundled',async()=>{assert.deepEqual((await state(environment())).ideas,[]);});
test('authentication, sync secret, JSON, and same-origin checks are enforced',async()=>{
 const env=environment();
 assert.equal((await worker.fetch(request('/api/ideas','GET',undefined,{},false),env)).status,401);
 assert.equal((await worker.fetch(request('/api/sync','POST',event()),env)).status,403);
 assert.equal((await worker.fetch(request('/api/sync','POST',event(),{'X-Idea-Sync-Key':'wrong'},false),env)).status,401);
 assert.equal((await worker.fetch(request('/mcp','POST',{}, {Origin:'https://other.example'}),env)).status,403);
 assert.equal((await worker.fetch(new Request('https://board.example/mcp',{method:'POST',headers:{'oai-authenticated-user-id':'test-user'},body:'{}'}),env)).status,415);
});
test('public hook can enroll its first named project without editing server source',async()=>{
 const env=environment();let response=await sync(env,event({name:'My project',description:'A small useful tool.'}));assert.equal(response.status,200);
 const p=(await response.json()).ideas[0];assert.equal(p.id,'my-project');assert.equal(p.name,'My project');assert.equal(p.status,'research');
 response=await sync(env,event({id:'older-hook'}));assert.equal(response.status,200);assert.equal((await response.json()).ideas[1].name,'older-hook');
});
test('unsafe identities and missing discovery evidence do not create cards',async()=>{
 const env=environment();for(const changes of [{id:'../escape'},{id:'__proto__'},{id:'Uppercase'},{name:5},{evidence:''},{status:'unknown'}])assert.ok((await sync(env,event(changes))).status>=400);
 assert.equal((await state(env)).ideas.length,0);
});
test('hook events are idempotent and an older turn cannot overwrite progress',async()=>{
 const env=environment(),e=event({observedAt:'2026-06-01T00:00:00Z'});let s=await(await sync(env,e)).json();const revision=s.revision;
 s=await(await sync(env,e)).json();assert.equal(s.revision,revision);
 await sync(env,event({observedAt:'2026-05-01T00:00:00Z',progress:'outdated'}));assert.equal((await state(env)).ideas[0].progress,e.progress);
});
test('manual archive and restore remain authoritative over automatic sync',async()=>{
 const env=environment();await sync(env,event());
 let response=await worker.fetch(request('/api/ideas/my-project/status','PATCH',{status:'discarded'}),env);assert.equal(response.status,200);assert.equal((await response.json()).ideas[0].previousStatus,'research');
 await sync(env,event({status:'dev'}));assert.equal((await state(env)).ideas[0].status,'discarded');
 await worker.fetch(request('/api/ideas/my-project/status','PATCH',{status:'research'}),env);assert.equal((await state(env)).ideas[0].status,'research');
});
test('new live and archive claims require evidence and explicit confirmation',async()=>{
 const env=environment();await sync(env,event());
 assert.equal((await sync(env,event({status:'live'}))).status,400);
 assert.equal((await sync(env,event({status:'discarded'}))).status,400);
 assert.equal((await sync(env,event({status:'live',deploymentVerified:true,deploymentUrl:'https://example.com/project'}))).status,200);
 assert.equal((await state(env)).ideas[0].url,'https://example.com/project');
});
test('concurrent first projects survive optimistic storage retries',async()=>{
 const env=environment();const responses=await Promise.all(Array.from({length:4},(_,i)=>sync(env,event({id:'project-'+i}))));assert.ok(responses.every(r=>r.status===200));assert.equal((await state(env)).ideas.length,4);
});
test('MCP advertises all five states and discovers ideas without a local hook',async()=>{
 const env=environment();const response=await worker.fetch(request('/mcp','POST',{jsonrpc:'2.0',id:1,method:'tools/list'}),env);
 const tools=(await response.json()).result.tools;assert.deepEqual(tools.find(t=>t.name==='sync_idea').inputSchema.properties.status.enum,['idea','research','dev','live','discarded']);
 const result=await mcp(env,'sync_idea',{name:'A new thought',description:'Investigate a useful tool.',status:'research',progress:'Compared existing approaches.',evidence:'User requested feasibility research.'});assert.equal(result.result.isError,undefined);
 const p=JSON.parse(result.result.content[0].text).ideas[0];assert.match(p.id,/^auto-[a-f0-9]{24}$/);
 await mcp(env,'sync_idea',{id:p.id,status:'dev',progress:'Started implementation.',evidence:'Created the first prototype.'});assert.equal((await state(env)).ideas.length,1);assert.equal((await state(env)).ideas[0].status,'dev');
});
test('automatic real sources replace legacy link markers while manual project status stays authoritative',async()=>{
 const env=environment();await sync(env,event());const original=(await state(env)).ideas[0];const chatUrl='https://chatgpt.com/c/11111111-2222-4333-8444-555555555555';
 let response=await worker.fetch(request('/api/ideas/my-project/chat-link','PATCH',{chatUrl}),env);assert.equal(response.status,200);
 let p=(await response.json()).ideas[0];assert.equal(p.chatUrl,chatUrl);assert.equal(p.updatedAt,original.updatedAt);
 response=await worker.fetch(request('/api/ideas/my-project/chat-link','PATCH',{chatUrl:'https://attacker.example'}),env);assert.equal(response.status,400);
 const newerChat='https://chatgpt.com/c/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
 await worker.fetch(request('/api/ideas/my-project/status','PATCH',{status:'idea'}),env);
 await sync(env,event({chatUrl:newerChat}));assert.equal((await state(env)).ideas[0].chatUrl,newerChat);assert.equal((await state(env)).ideas[0].status,'idea');
 await worker.fetch(request('/api/ideas/my-project/chat-link','PATCH',{chatUrl:null}),env);
 await sync(env,event({chatUrl}));assert.equal((await state(env)).ideas[0].chatUrl,chatUrl);
 await sync(env,event());assert.equal((await state(env)).ideas[0].chatUrl,chatUrl);
});
test('MCP supports checked final files without inventing a deployed URL',async()=>{
 const env=environment();const result=await mcp(env,'sync_idea',{name:'A printable model',description:'A small 3D model.',status:'live',progress:'Final mesh checked and sliced.',evidence:'Watertight mesh and slicer inspection passed.',artifactVerified:true,artifactName:'model.stl'});
 assert.equal(result.result.isError,undefined);const p=(await state(env)).ideas[0];assert.equal(p.deliveryKind,'artifact');assert.equal(p.url,'');
});

const sourceChat='https://chatgpt.com/c/11111111-2222-4333-8444-555555555555';
const chatIdea=(extra={})=>({name:"A research idea",description:"Compare useful approaches.",status:"research",progress:"Reviewed the options.",evidence:"User requested this investigation.",...extra});
async function sessionCall(env,args,{session='opaque-chat-session',user='test-user',name='sync_idea'}={}){
 return (await(await worker.fetch(request('/mcp','POST',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args,_meta:{'openai/session':session}}},{'oai-authenticated-user-id':user}),env)).json()).result;
}
const lastIdea=result=>JSON.parse(result.content[0].text).ideas.at(-1);
test('a known URL is reused across ideas and turns of the same authenticated chat, without storing its raw session',async()=>{
 const env=environment();
 let result=await sessionCall(env,chatIdea({chatUrl:sourceChat}));assert.equal(result.structuredContent.sourceLink.status,'linked');
 const id=lastIdea(result).id;
 result=await sessionCall(env,chatIdea({name:'Second idea'}));assert.equal(lastIdea(result).chatUrl,sourceChat);
 result=await sessionCall(env,{id,status:'research',progress:'同一会话的后续进展。'});assert.equal(JSON.parse(result.content[0].text).ideas.find(p=>p.id===id).chatUrl,sourceChat);
 assert.ok(!result.content[0].text.includes('opaque-chat-session'));
 const repeat=await sessionCall(env,{id,status:'research',progress:'同一会话的后续进展。'});assert.equal(JSON.parse(repeat.content[0].text).revision,JSON.parse(result.content[0].text).revision);
});
test('source mappings are isolated by user and session; unknown anonymous IDs never become URLs',async()=>{
 const env=environment();await sessionCall(env,chatIdea({chatUrl:sourceChat}));
 for(const [name,context] of [['Other session',{session:'another-chat'}],['Other user',{user:'another-user'}]]){
  const result=await sessionCall(env,chatIdea({name}),context);assert.equal(result.structuredContent.sourceLink.status,'missing');assert.equal(lastIdea(result).chatUrl,undefined);assert.match(result.content[1].text,/链接仍缺失/);
 }
});
test('linking once repairs all missing cards from that chat while preserving other known sources and project state',async()=>{
 const env=environment();const a=lastIdea(await sessionCall(env,chatIdea())),b=lastIdea(await sessionCall(env,chatIdea({name:'Second idea'})));
 const other='https://chatgpt.com/c/11111111-1111-4111-8111-111111111111';
 await sessionCall(env,{id:b.id,chatUrl:other},{session:'other-session',name:'link_idea_chat'});
 const result=await sessionCall(env,{id:a.id,chatUrl:sourceChat},{name:'link_idea_chat'}),state=JSON.parse(result.content[0].text);
 assert.equal(state.ideas.find(p=>p.id===a.id).chatUrl,sourceChat);assert.equal(state.ideas.find(p=>p.id===b.id).chatUrl,other);
 for(const field of ['status','progress','updatedAt'])assert.equal(state.ideas.find(p=>p.id===a.id)[field],a[field]);
 const c=lastIdea(await sessionCall(env,chatIdea({name:'Third idea'})));assert.equal(c.chatUrl,sourceChat);
});
test('late source information repairs an earlier duplicate without reverting newer progress or manual status',async()=>{
 const env=environment();const original=chatIdea({eventId:'first-turn',observedAt:'2026-11-01T00:00:00Z'}),first=lastIdea(await sessionCall(env,original));
 await sessionCall(env,{id:first.id,status:'dev',progress:'较新的实现进展。',observedAt:'2026-11-02T00:00:00Z'});
 await worker.fetch(request('/api/ideas/'+first.id+'/status','PATCH',{status:'idea'}),env);
 const result=await sessionCall(env,{...original,chatUrl:sourceChat}),p=lastIdea(result);assert.equal(p.chatUrl,sourceChat);assert.equal(p.progress,'较新的实现进展。');assert.equal(p.status,'idea');assert.equal(p.updatedAt,'2026-11-02T00:00:00Z');
});
test('a later source repairs earlier missing topics in the same chat but never unrelated sessions',async()=>{
 const env=environment();const first=lastIdea(await sessionCall(env,chatIdea())),unrelated=lastIdea(await sessionCall(env,chatIdea({name:'Unrelated idea'}),{session:'separate-chat'}));
 const result=await sessionCall(env,chatIdea({name:'New topic',chatUrl:sourceChat})),state=JSON.parse(result.content[0].text);
 assert.equal(state.ideas.find(p=>p.id===first.id).chatUrl,sourceChat);assert.equal(state.ideas.find(p=>p.id===unrelated.id).chatUrl,undefined);
});
