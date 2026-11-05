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
// Session metadata is an opaque correlation key, never a public conversation ID.
// Remember a real URL once supplied, and reuse it only in that caller's session.
async function sourceSession(request,meta){
 const session=meta?.['openai/session'],user=request.headers.get('oai-authenticated-user-id');
 return user&&typeof session==='string'&&session.length>0&&session.length<=512?await digest(JSON.stringify([user,session])):'';
}
function rememberSource(state,p,input,sessionKey='',source='sync',replace=true){
 let changed=false;
 if(sessionKey&&!(p.chatSessionKeys||[]).includes(sessionKey)){
  p.chatSessionKeys=[sessionKey,...(p.chatSessionKeys||[])].slice(0,24);changed=true;
 }
 const supplied=validChatURL(input.chatUrl);
 if(supplied&&sessionKey){
  const sources=state.chatSources||{};
  if(sources[sessionKey]!==supplied){
   delete sources[sessionKey];sources[sessionKey]=supplied;
   state.chatSources=Object.fromEntries(Object.entries(sources).slice(-256));changed=true;
  }
 }
 const url=supplied||(sessionKey?validChatURL(state.chatSources?.[sessionKey]):'');
 const save=(card,canReplace)=>{
  if(!url||(card.chatUrl&&!canReplace)||card.chatUrl===url)return;
  card.chatUrl=url;card.chatLinkSource=source;card.chatLinkUpdatedAt=new Date().toISOString();changed=true;
 };
 save(p,replace);
 // A chat can contain several ideas. Repair earlier unlinked cards from the
 // same session without replacing their independently known sources.
 if(supplied&&sessionKey)for(const card of state.ideas)if(card!==p&&card.chatSessionKeys?.includes(sessionKey))save(card,false);
 return changed;
}
async function updateChatLink(env,id,chatUrl,sessionKey=''){
 const url=chatUrl===null?'':validChatURL(chatUrl);
 if(chatUrl!==null&&!url)fail('请粘贴 ChatGPT 对话地址（https://chatgpt.com/c/...），不是分享或站点链接。');
 return mutate(env,state=>{
  const p=state.ideas.find(p=>p.id===id);if(!p)fail('Project not found',404);
  const unchanged=(p.chatUrl||'')===url&&p.chatLinkSource==='manual';
  const sourceChanged=url?rememberSource(state,p,{chatUrl:url},sessionKey,'manual'):false;
  if(unchanged)return sourceChanged;
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
async function syncProject(env,input,hookDiscovery=false,sessionKey=''){
 return mutate(env,state=>{
  let p=state.ideas.find(p=>p.id===input.id);
  validateSync(input,Boolean(p),hookDiscovery);
  if(!p){
   if((!input.discovery&&!hookDiscovery)||input.status==='discarded')fail('No idea to create');
   p={id:input.id,name:text(input.name,120),description:text(input.description,500),status:input.status,statusSource:'sync',history:[],url:'',threadId:'',createdAt:input.observedAt};state.ideas.push(p);
  }
  const stale=p.lastObservedAt&&Date.parse(input.observedAt)<Date.parse(p.lastObservedAt);
  const sourceChanged=rememberSource(state,p,input,sessionKey,'sync',!stale);
  // Supplying a missing source is useful even when progress is a duplicate or
  // older than the latest work. Never roll progress/status back to add a link.
  if((p.eventIds||[]).includes(input.eventId)||stale)return sourceChanged;
  p.progress=text(input.progress,1000);p.updatedAt=input.observedAt;p.lastObservedAt=input.observedAt;
  if(p.statusSource!=='manual'||input.statusConfirmed===true||input.archiveConfirmed===true)record(p,input.status,'sync',text(input.evidence,1000));
  if(input.deploymentVerified===true)p.url=text(input.deploymentUrl,2000);
  if(input.status==='live'&&input.artifactVerified){p.artifactName=text(input.artifactName,200);p.deliveryKind='artifact';}
  else if(input.status==='live'&&input.deploymentVerified)p.deliveryKind='website';
  if(/^[0-9a-f-]{36}$/i.test(input.threadId||''))p.threadId=input.threadId;
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
async function syncChatIdea(env,input,sessionKey=''){
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
 return syncProject(env,prepared,false,sessionKey);
}
const tools=[{name:'list_ideas',description:'查看已入板的想法、调研与作品进展。同步前先匹配已有主题并沿用 id，后续换聊天或目录不重复建卡。',annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{},additionalProperties:false}},{name:'sync_idea',description:'把 ChatGPT 网页聊天或 Codex 中用户自己的想法与调研同步到 Idea Flows 看板，无需本地目录或项目预登记。先 list_ideas 匹配，已有主题沿用 id；新主题提供 name、description、evidence，服务端生成编号。随口想法用 idea；资料、竞品、可行性调研用 research；实际制作才用 dev；调研完成不等于 live。保留手动状态。只传摘要，不传整段聊天；不得把假设举例或别人的想法新建为用户项目。来源链接是同步的一部分：尽量传入当前对话的真实 chatUrl；若返回 sourceLink.status=missing，不要宣称同步全部完成，应说明缺少链接并请用户提供一次地址栏网址。服务端会在同一匿名会话中复用真实链接，不得把匿名 session 当网址。上线需要验证，归档需要用户明确指令。',annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:'object',properties:{id:{type:'string',description:'已有卡片的 id，从 list_ideas 原样复制。新主题可省略，不编造。'},ideaKey:{type:'string',description:'可选的稳定主题标识；跨聊天实现同一目标时沿用，或直接使用已有 id。'},name:{type:'string',description:'用户想法或研究主题名称；新建必填。'},description:{type:'string',description:'主题目标；新建必填。'},discovery:{type:'object',description:'旧版 Codex 兼容字段，网页聊天无需提供。',properties:{kind:{type:'string',enum:['idea']},scopeId:{type:'string'}},required:['kind','scopeId'],additionalProperties:false},status:{type:'string',enum:STATUSES,description:'idea 想法；research 调研；dev 实现；live 已验证交付；discarded 用户明确归档。'},progress:{type:'string',description:'最近发现、已做工作及下一步待验证问题。'},eventId:{type:'string',description:'可选去重事件编号；省略时由服务端生成。'},observedAt:{type:'string',description:'可选实际进展时间 ISO 8601；省略时使用服务器时间。'},threadId:{type:'string',description:'仅用于已知的本地 Codex 聊天编号；ChatGPT 网页聊天请使用 chatUrl。'},chatUrl:{type:'string',description:'当前对话已知真实的 https://chatgpt.com/c/... 或 /g/.../c/... 地址。首次关联尽量提供；同一会话后续可复用。未知不得编造，返回 missing 时应补全。'},evidence:{type:'string',description:'支持本次想法和进展的简短事实依据；新建必填。'},deploymentUrl:{type:'string'},deploymentVerified:{type:'boolean'},artifactVerified:{type:'boolean'},artifactName:{type:'string'},archiveConfirmed:{type:'boolean'},statusConfirmed:{type:'boolean'}},required:['status','progress'],additionalProperties:false}}];
tools.push({name:'link_idea_chat',description:'给已有看板卡片关联、替换或移除真实的 ChatGPT 对话链接，不修改项目状态或进展。先 list_ideas 取得 id。ChatGPT 不一定提供可打开的当前聊天网址；没有真实网址时请用户从地址栏复制，不能把匿名 session 编号拼成网址。用户主动提供链接并要求关联时调用。兼容旧客户端补录来源；后续 hook 或同步提供真实地址时自动更新，不锁定手动链接。移除只清除网页关联，保留 Codex 来源。',annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:'object',properties:{id:{type:'string',description:'已有卡片的 id。'},chatUrl:{type:['string','null'],description:'用户提供或已知真实的 ChatGPT 对话地址；null 表示用户明确移除网页关联。'}},required:['id','chatUrl'],additionalProperties:false}});
async function mcp(request,env){
 const body=await request.json();let result;
 if(body.method==='server/discover')result={supportedVersions:['2026-07-28'],capabilities:{tools:{}}};
 else if(body.method==='initialize')result={protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'idea-flows',version:'1.1.1'},instructions:'同步前匹配已有卡片。同步包含真实来源链接；sourceLink.status=missing 表示来源仍待关联，不能宣称已完整同步。先使用上下文中已知真实的聊天网址；拿不到时请用户提供一次地址栏网址，再用 link_idea_chat 关联。后续同一会话会自动复用；openai/session 是匿名关联键，绝不能拼成聊天网址。'};
 else if(body.method==='tools/list')result={tools};
 else if(body.method==='tools/call'){
  try{
   const args=body.params?.arguments||{},name=body.params?.name,sessionKey=await sourceSession(request,body.params?._meta);
   const value=name==='list_ideas'?(await read(env)).state:name==='sync_idea'?await syncChatIdea(env,args,sessionKey):name==='link_idea_chat'?await updateChatLink(env,args.id,args.chatUrl,sessionKey):fail('Unknown tool');
   result={content:[{type:'text',text:JSON.stringify(value)}]};
   if(name==='sync_idea'||name==='link_idea_chat'){
    const p=value.ideas.find(p=>p.id===args.id)||value.ideas.find(p=>ideaName(p.name)===ideaName(args.name));
    const url=validChatURL(p?.chatUrl);
    result.structuredContent={sourceLink:{status:url?'linked':p?.threadId||p?.workspacePath?'codex':'missing',...(url?{url}:{})}};
    if(name==='sync_idea'&&result.structuredContent.sourceLink.status==='missing')result.content.push({type:'text',text:'进展已保存，但来源对话链接仍缺失。请使用已知真实的当前 ChatGPT 对话网址调用 link_idea_chat；若当前上下文没有网址，请用户提供一次地址栏链接。不要将 openai/session 或本地 Codex 编号拼成网页网址。'});
   }
  }
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
