// The build replaces these two constants with the authored web files and enrolled projects.
const ASSETS = /*__ASSETS__*/ {};
const PROJECTS = /*__PROJECTS__*/ [];
const KEY='idea-flows/state-v2.json';
const STATUSES=['idea','research','dev','live','discarded'];
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const text=(v,max)=>typeof v==='string'?v.slice(0,max):'';
function initial(){return {version:2,revision:0,lastSaved:new Date().toISOString(),ideas:PROJECTS.map(({cwd,...p})=>({...p,history:[],statusSource:'sync',url:p.url||''}))};}
async function read(env){
 if(!env.BUCKET)fail('Storage is unavailable',503);
 const object=await env.BUCKET.get(KEY),state=object?await object.json():initial();
 // Older cards without a source chat can still open their known local workspace.
 for(const p of state.ideas){if(!p.threadId){const source=PROJECTS.find(item=>item.id===p.id);if(source)p.workspacePath=source.cwd;}}
 return {state,etag:object?.etag};
}
async function mutate(env,apply){
 for(let attempt=0;attempt<6;attempt++){
  const {state,etag}=await read(env);const changed=apply(state);if(changed===false)return state;
  state.revision++;state.lastSaved=new Date().toISOString();
  const stored=await env.BUCKET.put(KEY,JSON.stringify(state),{onlyIf:etag?{etagMatches:etag}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});
  if(stored)return state;
 }
 fail('Concurrent update; please retry',409);
}
function record(p,status,source,evidence){const now=new Date().toISOString();if(status!==p.status){if(status==='discarded')p.previousStatus=p.status;p.history=[{at:now,from:p.status,to:status,source,evidence},...p.history].slice(0,200);p.status=status;}p.statusSource=source;p.statusChangedAt=now;}
async function updateStatus(env,id,status){if(!STATUSES.includes(status))fail('Invalid status');return mutate(env,state=>{const p=state.ideas.find(p=>p.id===id);if(!p)fail('Project not found',404);if(p.status===status)return false;record(p,status,'manual','在项目卡片上更改状态');});}
async function updateChatLink(env,id,chatUrl){
 const url=chatUrl===null?'':validChatURL(chatUrl);
 if(chatUrl!==null&&!url)fail('请粘贴 ChatGPT 对话地址（https://chatgpt.com/c/...），不是分享或站点链接。');
 return mutate(env,state=>{
  const p=state.ideas.find(p=>p.id===id);if(!p)fail('Project not found',404);
  if((p.chatUrl||'')===url&&p.chatLinkSource==='manual')return false;
  p.chatUrl=url;p.chatLinkSource='manual';p.chatLinkUpdatedAt=new Date().toISOString();
  p.history=[{at:p.chatLinkUpdatedAt,source:'manual',text:url?'关联 ChatGPT 对话':'移除 ChatGPT 对话关联'},...(p.history||[])].slice(0,200);
 });
}
function validateSync(input,known=false,hookDiscovery=false){
 if(hookDiscovery&&!/^[a-z0-9][a-z0-9-]{0,79}$/.test(input.id||''))fail('Invalid project id');
 if(!known&&!(hookDiscovery&&!input.discovery)&&!PROJECTS.some(p=>p.id===input.id)&&!(input.discovery?.kind==='idea'&&/^auto-[a-f0-9]{24}$/.test(input.id||'')&&/^scope-[a-f0-9]{24}$/.test(input.discovery.scopeId||'')))fail('Project is not enrolled or discovered',403);
 if(input.discovery||(!known&&hookDiscovery)){
  if(typeof input.name!=='string'||!input.name.trim()||input.name.length>120||typeof input.description!=='string'||!input.description.trim()||input.description.length>500||typeof input.evidence!=='string'||!input.evidence.trim()||input.evidence.length>1000)fail('Idea discovery requires a name, goal and evidence');
 }
 if(!STATUSES.includes(input.status))fail('Invalid status');
 if(!input.eventId||typeof input.eventId!=='string'||input.eventId.length>160)fail('Missing event id');
 if(typeof input.progress!=='string'||!input.progress.trim()||input.progress.length>1000)fail('Missing progress');
 if(!Number.isFinite(Date.parse(input.observedAt)))fail('Missing observed time');
 if(input.chatUrl!==undefined&&!validChatURL(input.chatUrl))fail('Use the actual https://chatgpt.com/c/... source chat URL, or omit chatUrl');
 if(input.deploymentVerified===true&&(!/^https?:\/\//.test(input.deploymentUrl||'')||!input.evidence))fail('A verified website URL and evidence are required');
 if(input.status==='discarded'&&input.archiveConfirmed!==true)fail('Archiving requires explicit user intent');
 if(input.status==='live'&&!(input.evidence&&((input.deploymentVerified===true&&/^https?:\/\//.test(input.deploymentUrl||''))||(input.artifactVerified===true&&typeof input.artifactName==='string'&&input.artifactName.trim()&&input.artifactName.length<=200&&!/[\\/]/.test(input.artifactName)))))fail('A verified deployment or usable final artifact is required');
}
async function syncProject(env,input,hookDiscovery=false){
 return mutate(env,state=>{
  let p=state.ideas.find(p=>p.id===input.id);
  validateSync(input,Boolean(p),hookDiscovery);
  if(!p){
   if((!input.discovery&&!hookDiscovery)||input.status==='discarded')fail('No idea to create');
   p={id:input.id,name:text(input.name,120),description:text(input.description,500),status:input.status,statusSource:'sync',history:[],url:'',threadId:'',createdAt:input.observedAt};state.ideas.push(p);
  }
  if((p.eventIds||[]).includes(input.eventId))return false;
  if(p.lastObservedAt&&Date.parse(input.observedAt)<Date.parse(p.lastObservedAt))return false;
  p.progress=text(input.progress,1000);p.updatedAt=input.observedAt;p.lastObservedAt=input.observedAt;
  if(p.statusSource!=='manual'||input.statusConfirmed===true||input.archiveConfirmed===true)record(p,input.status,'sync',text(input.evidence,1000));
  if(input.deploymentVerified===true)p.url=text(input.deploymentUrl,2000);
  if(input.status==='live'&&input.artifactVerified){p.artifactName=text(input.artifactName,200);p.deliveryKind='artifact';}
  else if(input.status==='live'&&input.deploymentVerified)p.deliveryKind='website';
  if(/^[0-9a-f-]{36}$/i.test(input.threadId||''))p.threadId=input.threadId;
  if(input.chatUrl&&p.chatLinkSource!=='manual'){p.chatUrl=validChatURL(input.chatUrl);p.chatLinkSource='sync';}
  p.eventIds=[input.eventId,...(p.eventIds||[])].slice(0,100);
  p.history=[{at:input.observedAt,text:p.progress,source:'sync',evidence:text(input.evidence,1000)},...p.history].slice(0,200);
 });
}
function validChatURL(value){
 if(typeof value!=='string'||value.length>2000)return '';
 try{const u=new URL(value.trim());return u.protocol==='https:'&&u.hostname==='chatgpt.com'&&!u.port&&!u.username&&!u.password&&/^\/(?:g\/[^/]+\/)?c\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/?$/i.test(u.pathname)?u.origin+u.pathname.replace(/\/$/,''):'';}catch{return '';}
}
const ideaName=value=>typeof value==='string'?value.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g,' '):'';
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
// ChatGPT has no local directory enrollment. Only the authenticated MCP path
// prepares discovery metadata; the secret-key hook endpoint stays strict.
async function syncChatIdea(env,input){
 const {state}=await read(env);
 let existing=state.ideas.find(p=>p.id===input.id);
 if(!existing&&ideaName(input.name)){
  const matches=state.ideas.filter(p=>ideaName(p.name)===ideaName(input.name));
  if(matches.length>1)fail('Multiple ideas share that name; use list_ideas and provide the matching id');
  existing=matches[0];
 }
 if(input.ideaKey!==undefined&&(typeof input.ideaKey!=='string'||!input.ideaKey.trim()||input.ideaKey.length>160))fail('ideaKey must be a short stable topic key');
 if(!existing&&!ideaName(input.name))fail('For a new idea, provide name, description, evidence, status and progress; no local project enrollment is needed');
 const identity=existing?.id||'auto-'+(await digest('chat-idea:'+ideaName(input.ideaKey||input.name))).slice(0,24);
 const prepared={...input,id:identity,observedAt:input.observedAt??new Date().toISOString()};
 if(existing)delete prepared.discovery;
 else prepared.discovery={kind:'idea',scopeId:'scope-'+(await digest('chat-source:'+(input.chatUrl||input.threadId||'chatgpt'))).slice(0,24)};
 prepared.eventId=input.eventId??'chat-'+await digest(JSON.stringify([identity,input.status,input.progress,input.evidence||'',input.observedAt||'',input.chatUrl||'',input.deploymentUrl||'',input.deploymentVerified===true,input.artifactName||'',input.artifactVerified===true,input.statusConfirmed===true,input.archiveConfirmed===true]));
 return syncProject(env,prepared);
}
const tools=[{name:'list_ideas',description:'查看已入板的想法、调研与作品进展。同步前先匹配已有主题并沿用 id，后续换聊天或目录不重复建卡。',annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{},additionalProperties:false}},{name:'sync_idea',description:'把 ChatGPT 网页聊天或 Codex 中用户自己的想法与调研同步到 Idea Flows 看板，无需本地目录或项目预登记。先 list_ideas 匹配，已有主题沿用 id；新主题提供 name、description、evidence，服务端生成编号。随口想法用 idea；资料、竞品、可行性调研用 research；实际制作才用 dev；调研完成不等于 live。保留手动状态。只传摘要，不传整段聊天；不得把假设举例或别人的想法新建为用户项目。chatUrl 仅传已知真实来源，未知则省略。上线需要验证，归档需要用户明确指令。',annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:'object',properties:{id:{type:'string',description:'已有卡片的 id，从 list_ideas 原样复制。新主题可省略，不编造。'},ideaKey:{type:'string',description:'可选的稳定主题标识；跨聊天实现同一目标时沿用，或直接使用已有 id。'},name:{type:'string',description:'用户想法或研究主题名称；新建必填。'},description:{type:'string',description:'主题目标；新建必填。'},discovery:{type:'object',description:'旧版 Codex 兼容字段，网页聊天无需提供。',properties:{kind:{type:'string',enum:['idea']},scopeId:{type:'string'}},required:['kind','scopeId'],additionalProperties:false},status:{type:'string',enum:STATUSES,description:'idea 想法；research 调研；dev 实现；live 已验证交付；discarded 用户明确归档。'},progress:{type:'string',description:'最近发现、已做工作及下一步待验证问题。'},eventId:{type:'string',description:'可选去重事件编号；省略时由服务端生成。'},observedAt:{type:'string',description:'可选实际进展时间 ISO 8601；省略时使用服务器时间。'},threadId:{type:'string',description:'仅用于已知的本地 Codex 聊天编号；ChatGPT 网页聊天请使用 chatUrl。'},chatUrl:{type:'string',description:'已知真实的 https://chatgpt.com/c/... 或 /g/.../c/... 来源地址；未知则省略，不编造。'},evidence:{type:'string',description:'支持本次想法和进展的简短事实依据；新建必填。'},deploymentUrl:{type:'string'},deploymentVerified:{type:'boolean'},artifactVerified:{type:'boolean'},artifactName:{type:'string'},archiveConfirmed:{type:'boolean'},statusConfirmed:{type:'boolean'}},required:['status','progress'],additionalProperties:false}}];
tools.push({name:'link_idea_chat',description:'给已有看板卡片关联、替换或移除真实的 ChatGPT 对话链接，不修改项目状态或进展。先 list_ideas 取得 id。ChatGPT 不一定提供可打开的当前聊天网址；没有真实网址时请用户从地址栏复制，不能把匿名 session 编号拼成网址。用户主动提供链接并要求关联时调用。手动关联优先于后续自动同步；移除只清除网页关联，保留 Codex 来源。',annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:'object',properties:{id:{type:'string',description:'已有卡片的 id。'},chatUrl:{type:['string','null'],description:'用户提供或已知真实的 ChatGPT 对话地址；null 表示用户明确移除网页关联。'}},required:['id','chatUrl'],additionalProperties:false}});
async function mcp(request,env){
 const body=await request.json();let result;
 if(body.method==='server/discover')result={supportedVersions:['2026-07-28'],capabilities:{tools:{}}};
 else if(body.method==='initialize')result={protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'idea-flows',version:'1.0.0'}};
 else if(body.method==='tools/list')result={tools};
 else if(body.method==='tools/call'){
  try{const args=body.params?.arguments||{};const value=body.params?.name==='list_ideas'?(await read(env)).state:body.params?.name==='sync_idea'?await syncChatIdea(env,args):body.params?.name==='link_idea_chat'?await updateChatLink(env,args.id,args.chatUrl):fail('Unknown tool');result={content:[{type:'text',text:JSON.stringify(value)}]};}
  catch(error){result={isError:true,content:[{type:'text',text:error.message}]};}
 }else if(body.method?.startsWith('notifications/'))return new Response(null,{status:204});
 else return json({jsonrpc:'2.0',id:body.id??null,error:{code:-32601,message:'Method not found'}});
 return json({jsonrpc:'2.0',id:body.id??null,result});
}
export default {async fetch(request,env){
 try{
  const url=new URL(request.url),path=url.pathname;
  const hook=Boolean(env.IDEA_SYNC_SECRET)&&request.headers.get('X-Idea-Sync-Key')===env.IDEA_SYNC_SECRET;
  const identity=request.headers.get('oai-authenticated-user-id');
  if(path.startsWith('/api/')||path==='/mcp'){
   if(!identity&&!hook)return json({error:'Sign in required'},401);
   if(!['GET','HEAD'].includes(request.method)&&!hook){
    const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return json({error:'Invalid origin'},403);
    if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'JSON required'},415);
   }
   if(path==='/api/ideas'&&request.method==='GET')return json((await read(env)).state);
   const match=path.match(/^\/api\/ideas\/([a-z0-9-]+)\/status$/);
   if(match&&request.method==='PATCH')return json(await updateStatus(env,match[1],(await request.json()).status));
   const chatMatch=path.match(/^\/api\/ideas\/([a-z0-9-]+)\/chat-link$/);
   if(chatMatch&&request.method==='PATCH')return json(await updateChatLink(env,chatMatch[1],(await request.json()).chatUrl));
   if(path==='/api/sync'&&request.method==='POST'){if(!hook)return json({error:'Sync key required'},403);const input=await request.json();input.name||=input.id;input.description||='从 Codex 同步的项目。';return json(await syncProject(env,input,true));}
   if(path==='/mcp'&&request.method==='POST')return mcp(request,env);
   return json({error:'Not found'},404);
  }
  const asset=ASSETS[path==='/'?'/index.html':path];
  if(!asset)return new Response('Not found',{status:404});
  return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
 }catch(error){return json({error:error.status?error.message:'Something went wrong'},error.status||500);}
}};
