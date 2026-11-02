import {site} from './site.js';
import {t} from './locale.js';
import {labels,ageDays,dateText,shortDate,chatURL,chatGPTURL} from './data.js';
import {load,fetchState,changeStatus,changeChatLink,cache} from './store.js';
let state=load(),filter='all',transition=null,toastTimer,pollBusy=false;
const pending=new Set(),board=document.querySelector('#board'),drawer=document.querySelector('#drawer');
const linkEditor=document.querySelector('#chat-link-editor'),linkInput=document.querySelector('#chat-link-url'),linkError=document.querySelector('#chat-link-error');
let linkingId=null,linkOrigin=null,linkSaving=false;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const nameFor=id=>'project-'+[...id].map(c=>c.codePointAt(0).toString(16)).join('-');
const webURL=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const codexTarget='target="_blank" rel="noopener noreferrer"';
const statusLabel=p=>p.status==='live'&&p.deliveryKind==='artifact'?t('completed'):labels[p.status];
function codexLink(p){const href=chatURL(p);return href?`<a class="codex-link" href="${esc(href)}" ${codexTarget}>${t('openChat',{app:chatGPTURL(p)?'ChatGPT':'Codex'})}</a>`:`<span class="codex-link" aria-disabled="true">${t('noChat')}</span>`;}
function siteLink(p){const url=webURL(p.url);return url?`<a class="visit" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${t('visitSite')}</a>`:'';}
function conversationActions(p){return `<div class="conversation-actions">${chatURL(p)?codexLink(p):''}<button type="button" class="associate-link" data-link-chat="${esc(p.id)}" aria-label="${esc(t('associationLabel',{action:t(chatGPTURL(p)?'changeAction':'linkAction'),name:p.name}))}" aria-controls="chat-link-editor" aria-haspopup="dialog">${t(chatGPTURL(p)?'changeAssociation':chatURL(p)?'associateWeb':'associateChat')}</button></div>`;}
function projectLinks(p){return `<div class="card-links">${conversationActions(p)}${siteLink(p)}</div>`;}
function heading(p){const href=chatURL(p);return href?`<a class="card-heading" href="${esc(href)}" ${codexTarget} title="${esc(t('openProject',{app:chatGPTURL(p)?'ChatGPT':'Codex',name:p.name}))}">${esc(p.name)}<svg class="codex-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></a>`:`<span class="card-heading">${esc(p.name)}</span>`;}
function statusControl(p){return `<div class="status-control"><button class="status-trigger" data-menu="${esc(p.id)}" aria-expanded="false" aria-controls="menu-${esc(p.id)}" aria-label="${esc(t('changeState',{name:p.name,status:statusLabel(p)}))}"><span class="status-dot ${p.status}"></span>${statusLabel(p)}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button><div class="status-menu" id="menu-${esc(p.id)}" aria-label="${esc(t('stateOptions',{name:p.name}))}">${Object.entries(labels).filter(([key])=>key!==p.status).map(([key,label])=>`<button data-status="${key}" data-id="${esc(p.id)}" ${pending.has(p.id)?'disabled':''}><span class="status-dot ${key}"></span>${key==='discarded'?t('archive'):label}</button>`).join('')}</div></div>`;}
const attributes=p=>`data-idea="${esc(p.id)}" style="view-transition-name:${nameFor(p.id)}"`;
function liveCard(p){return `<article class="live-card ${p.color==='blue'?'blue':''}" ${attributes(p)}><div class="card-top status-row">${statusControl(p)}<span class="mono">${esc(dateText(p.updatedAt).slice(0,7))}</span></div><h2>${heading(p)}</h2><p>${esc(p.description)}</p><p class="progress">${esc(p.progress)}</p>${projectLinks(p)}</article>`;}
function devCard(p){const d=ageDays(p),level=d<=3?5:d<=10?4:d<=21?3:d<=35?2:1,tone=d<=3?'':d<=14?'warm':d<=30?'cool':'stale';return `<article class="dev-card ${tone}" ${attributes(p)}><div class="dev-meta status-row">${statusControl(p)}<div class="age-actions"><span class="ago">${t(d<=14?'updatedAgo':'inactiveDays',{days:d})}</span>${d>30?`<button class="quick-archive" data-id="${esc(p.id)}" data-status="discarded" aria-label="${esc(t('archiveProject',{name:p.name}))}">${t('archive')} <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5h10v8H3zM2 2h12v3H2zM6 8h4"/></svg></button>`:''}</div></div><h3>${heading(p)}</h3><p>${esc(p.description)}</p><p class="progress">${t('workingOn')}${esc(p.progress||t('waitingUpdate'))}</p><div class="card-bottom"><div class="bars" role="img" aria-label="${t('activity',{level})}">${[0,1,2,3,4].map(k=>`<span class="${k<level?'on':''}"></span>`).join('')}</div>${projectLinks(p)}</div></article>`;}
function ideaCard(p){return `<article class="idea-tile" ${attributes(p)}><div class="idea-top status-row">${statusControl(p)}<span class="idea-date">${esc(shortDate(p))}</span></div><h3 class="idea-name">${heading(p)}</h3><p class="idea-description">${esc(p.description)}</p>${projectLinks(p)}</article>`;}
function researchCard(p){return `<article class="research-card" ${attributes(p)}><div class="idea-top status-row">${statusControl(p)}<span class="idea-date">${esc(shortDate(p))}</span></div><h3>${heading(p)}</h3><p>${esc(p.description)}</p><p class="progress">${t('researchProgress')}${esc(p.progress||t('researchPending'))}</p>${projectLinks(p)}</article>`;}
function render(){
 const live=state.ideas.filter(p=>p.status==='live'),dev=state.ideas.filter(p=>p.status==='dev'),research=state.ideas.filter(p=>p.status==='research'),ideas=state.ideas.filter(p=>p.status==='idea'),archived=state.ideas.filter(p=>p.status==='discarded');
 board.classList.toggle('filtered',filter!=='all');
 board.style.setProperty('--section-count',Math.max(1,[live,dev,research,ideas].filter(items=>items.length).length));
 board.innerHTML=`<header class="index"><div class="index-top"><button class="home mono" data-filter="all" aria-label="${t('allProjects')}">${esc(site.eyebrow)}</button><h1>${site.heading.map(esc).join('<br> ')}</h1></div><nav class="statistics" aria-label="${t('filters')}">${[['live',t('liveFilter'),live.length,'#ff4f00'],['dev',labels.dev,dev.length,'#ffd23f'],['research',labels.research,research.length,'#9dbce7'],['idea',t('ideasFilter'),ideas.length,'#dcdad3']].map(([key,text,count,color])=>`<button class="stat" data-filter="${key}" aria-pressed="${filter===key}"><span class="swatch" style="background:${color}" aria-hidden="true"></span><span class="label">${text}</span><span class="count">${pad(count)}</span></button>`).join('')}${filter!=='all'?`<button class="reset-filter" data-filter="all">${t('backToAll')}</button>`:''}<p class="updated">${state.lastSaved?t('updated',{date:dateText(state.lastSaved)}):t('reading')}</p><p class="demo-note" role="status">${esc(state.connection||t('connecting'))}<br>${t('syncLabel')}</p></nav><div class="index-actions"><button class="archive-link" id="open-drawer"><span class="mono">${t('drawer')}</span><strong>${t('archiveCount',{count:archived.length})}</strong></button></div></header>
 ${(filter==='all'&&live.length)||filter==='live'?`<section class="live-section ${live.length===1?'single':''}" aria-label="${labels.live}">${live.length?live.map(liveCard).join(''):`<div class="empty">${t('emptyLive')}</div>`}</section>`:''}
 ${(filter==='all'&&dev.length)||filter==='dev'?`<section class="dev-section ${dev.length===1?'single':''}" aria-label="${labels.dev}">${dev.length?dev.map(devCard).join(''):`<div class="empty">${t('emptyDev')}</div>`}</section>`:''}
 ${(filter==='all'&&research.length)||filter==='research'?`<section class="research-section" aria-label="${labels.research}">${research.length?research.map(researchCard).join(''):`<div class="empty">${t('emptyResearch')}</div>`}</section>`:''}
 ${(filter==='all'&&ideas.length)||filter==='idea'?`<section class="ideas-section ${ideas.length===1?'single':''}" aria-label="${t('ideasFilter')}"><div class="idea-title"><h2>${t('ideasFilter')}</h2></div>${ideas.length?ideas.map(ideaCard).join(''):`<div class="empty">${t('emptyIdeas')}</div>`}</section>`:''}
 ${filter==='all'&&!live.length&&!dev.length&&!research.length&&!ideas.length?`<div class="empty board-empty">${t('emptyBoard')}</div>`:''}`;
 if(drawer.open)renderDrawer();
}
function renderDrawer(){const list=state.ideas.filter(p=>p.status==='discarded');document.querySelector('#discarded-list').innerHTML=list.length?list.map(p=>`<article class="discarded-item" ${attributes(p)}><div class="drawer-card-top status-row">${statusControl(p)}<span class="mono">${esc(shortDate(p))}</span></div><h3>${heading(p)}</h3><p>${esc(p.progress)}</p><div class="card-links">${conversationActions(p)}${siteLink(p)}<button class="restore-button" data-status="${esc(p.previousStatus||'idea')}" data-id="${esc(p.id)}">${t('restore')}</button></div></article>`).join(''):`<div class="empty">${t('emptyArchive')}</div>`;}
function toast(message){const el=document.querySelector('#toast');clearTimeout(toastTimer);el.textContent=message;el.classList.add('visible');toastTimer=setTimeout(()=>el.classList.remove('visible'),4000);}
function repaint(focus,chatId){
 transition?.skipTransition();
 const update=()=>{render();if(focus)board.querySelector(`[data-filter="${focus}"]`)?.focus({preventScroll:true});if(chatId)document.querySelector(`${drawer.open?'#drawer':'#board'} [data-link-chat="${CSS.escape(chatId)}"]`)?.focus({preventScroll:true});};
 if(document.startViewTransition){transition=document.startViewTransition(update);transition.finished.catch(()=>{});}else{update();if(!reduced())board.querySelectorAll('section').forEach((el,i)=>el.animate([{opacity:.25,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0 0 0 0)'}],{duration:280,delay:i*30,easing:'cubic-bezier(.16,1,.3,1)'}));}
}
function archiveFlight(id){
 const source=document.querySelector(`[data-idea="${CSS.escape(id)}"]`),target=document.querySelector('#open-drawer');if(!source||reduced()||drawer.open)return;
 const from=source.getBoundingClientRect(),to=target.getBoundingClientRect(),ghost=source.cloneNode(true);
 ghost.removeAttribute('data-idea');ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
 ghost.classList.add('archive-ghost');Object.assign(ghost.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px',viewTransitionName:'none'});document.body.append(ghost);source.style.viewTransitionName='none';
 const x=(to.top>=0?to.left+to.width/2:innerWidth-28)-from.left-from.width/2,y=(to.top>=0?to.top+to.height/2:28)-from.top-from.height/2;
 ghost.animate([{transform:'translate(0,0) scale(1)',opacity:1,clipPath:'inset(0)'},{offset:.24,transform:'translate(0,-16px) scale(.96)',opacity:1,clipPath:'inset(0)'},{transform:`translate(${x}px,${y}px) scale(.06) rotate(-8deg)`,opacity:0,clipPath:'inset(10% 0 10% 0)'}],{duration:520,easing:'cubic-bezier(.65,0,.25,1)',fill:'forwards'}).finished.then(()=>ghost.remove(),()=>ghost.remove());
}
async function repaintArchived(id){
 transition?.skipTransition();if(transition)await transition.finished.catch(()=>{});
 const before=new Map([...board.querySelectorAll('[data-idea]')].map(el=>[el.dataset.idea,el.getBoundingClientRect()]));
 archiveFlight(id);render();
 if(!reduced())board.querySelectorAll('[data-idea]').forEach(el=>{const a=before.get(el.dataset.idea),b=el.getBoundingClientRect();if(a&&(a.left!==b.left||a.top!==b.top))el.animate([{transform:`translate(${a.left-b.left}px,${a.top-b.top}px)`},{transform:'translate(0,0)'}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'});});
}
async function setStatus(id,status){
 const old=state.ideas.find(p=>p.id===id);if(!old||pending.has(id)||status===old.status)return;pending.add(id);document.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach(el=>el.disabled=true);
 try{const next=await changeStatus(id,status);if(next.revision>=state.revision){state={...next,connection:t('connected')};cache(state);}if(status==='discarded')await repaintArchived(id);else repaint();toast(`${old.name} · ${status==='discarded'?t('discarded'):labels[status]}`);}
 catch(error){toast(error.message||t('saveStateError'));}
 finally{pending.delete(id);document.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach(el=>el.disabled=false);}
}
function handleClick(e){
 const link=e.target.closest('[data-link-chat]');if(link){openChatLink(link);return;}
 const choice=e.target.closest('[data-status]');if(choice){setStatus(choice.dataset.id,choice.dataset.status);return;}
 const menu=e.target.closest('[data-menu]');if(menu){const control=menu.closest('.status-control');control.classList.add('menu-open');menu.setAttribute('aria-expanded','true');return;}
 const control=e.target.closest('[data-filter]');if(control){filter=filter===control.dataset.filter?'all':control.dataset.filter;repaint(filter);return;}
 if(e.target.closest('#open-drawer')){renderDrawer();drawer.showModal();}
}
function placeChatLink(){
 if(!linkEditor.matches(':popover-open')||!linkOrigin?.isConnected)return;
 const viewport=window.visualViewport,originX=viewport?.offsetLeft||0,originY=viewport?.offsetTop||0,width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
 linkEditor.style.maxHeight=Math.max(120,height-32)+'px';
 const anchor=linkOrigin.getBoundingClientRect(),box=linkEditor.getBoundingClientRect();
 const left=Math.max(originX+16,Math.min(anchor.left,originX+width-box.width-16));
 const below=anchor.bottom+8,top=below+box.height<=originY+height-16?below:Math.max(originY+16,anchor.top-box.height-8);
 Object.assign(linkEditor.style,{left:left+'px',top:top+'px'});
}
function openChatLink(origin){
 const p=state.ideas.find(p=>p.id===origin.dataset.linkChat);if(!p||linkSaving)return;
 if(linkEditor.matches(':popover-open'))linkEditor.hidePopover();
 linkingId=p.id;linkOrigin=origin;(origin.closest('dialog')||document.body).append(linkEditor);
 document.querySelector('#chat-link-project').textContent=p.name;linkInput.value=chatGPTURL(p);linkInput.removeAttribute('aria-invalid');linkError.hidden=true;
 document.querySelector('#remove-chat-link').hidden=!chatGPTURL(p);
 linkEditor.showPopover();placeChatLink();linkInput.focus({preventScroll:true});
}
async function saveChatLink(remove=false){
 if(linkSaving||!linkingId)return;
 const url=remove?null:chatGPTURL({chatUrl:linkInput.value});
 if(!remove&&!url){linkInput.setAttribute('aria-invalid','true');linkError.textContent=t('invalidChat');linkError.hidden=false;placeChatLink();linkInput.focus();return;}
 const id=linkingId;linkSaving=true;pending.add(id);linkError.hidden=true;
 linkEditor.querySelectorAll('button,input').forEach(el=>el.disabled=true);
 try{const next=await changeChatLink(id,url);if(next.revision>=state.revision){state={...next,connection:t('connected')};cache(state);}linkEditor.hidePopover();repaint(undefined,id);toast(remove?t('removedChat'):t('linkedChat'));}
 catch(error){linkError.textContent=error.message;linkError.hidden=false;placeChatLink();}
 finally{pending.delete(id);linkSaving=false;linkEditor.querySelectorAll('button,input').forEach(el=>el.disabled=false);}
}
document.querySelector('#chat-link-form').addEventListener('submit',e=>{e.preventDefault();saveChatLink();});
document.querySelector('#remove-chat-link').addEventListener('click',()=>saveChatLink(true));
document.querySelector('#close-chat-link').addEventListener('click',()=>{linkEditor.hidePopover();linkOrigin?.focus({preventScroll:true});});
linkInput.addEventListener('input',()=>{linkInput.removeAttribute('aria-invalid');linkError.hidden=true;});
window.addEventListener('resize',placeChatLink);window.addEventListener('scroll',placeChatLink,true);window.visualViewport?.addEventListener('resize',placeChatLink);
board.addEventListener('click',handleClick);drawer.addEventListener('click',handleClick);
document.addEventListener('pointerdown',e=>document.querySelectorAll('.menu-open').forEach(control=>{if(!control.contains(e.target)){control.classList.remove('menu-open');control.querySelector('[data-menu]').setAttribute('aria-expanded','false');if(control.contains(document.activeElement))document.activeElement.blur();}}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const control=document.querySelector('.menu-open,.status-control:focus-within');if(control){e.preventDefault();control.classList.remove('menu-open');control.querySelector('[data-menu]').setAttribute('aria-expanded','false');if(control.contains(document.activeElement))document.activeElement.blur();}}});
document.addEventListener('focusin',e=>{const c=e.target.closest('.status-control');if(c)c.querySelector('[data-menu]').setAttribute('aria-expanded','true');});
document.addEventListener('focusout',e=>{const c=e.target.closest('.status-control');if(c&&!c.contains(e.relatedTarget)){c.classList.remove('menu-open');c.querySelector('[data-menu]').setAttribute('aria-expanded','false');}});
document.addEventListener('pointerover',e=>{if(e.pointerType==='mouse'){const c=e.target.closest('.status-control');if(c)c.querySelector('[data-menu]').setAttribute('aria-expanded','true');}});
document.addEventListener('pointerout',e=>{const c=e.target.closest('.status-control');if(c&&!c.contains(e.relatedTarget)&&!c.contains(document.activeElement)){c.classList.remove('menu-open');c.querySelector('[data-menu]').setAttribute('aria-expanded','false');}});
document.querySelector('[data-close="drawer"]').addEventListener('click',()=>drawer.close());drawer.addEventListener('close',()=>board.querySelector('#open-drawer')?.focus());
async function sync(){
 if(pollBusy||pending.size||document.hidden)return;pollBusy=true;
 try{const next=await fetchState();if(next.revision!==state.revision||state.connection!==t('connected')){state={...next,connection:t('connected')};cache(state);repaint();}}
 catch{if(state.connection!==t('disconnected')){state.connection=t('disconnected');render();}}
 finally{pollBusy=false;}
}
render();sync();setInterval(sync,10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});window.addEventListener('online',sync);
