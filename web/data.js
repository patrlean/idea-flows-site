import {site} from './site.js';
export const labels={idea:'想法',research:'调研',dev:'开发中',live:'已上线',discarded:'已归档'};
export function ageDays(idea){return Math.max(0,Math.floor((Date.now()-Date.parse(idea.updatedAt))/86400000));}
export function dateText(iso){const parts=Object.fromEntries(new Intl.DateTimeFormat(site.locale,{timeZone:site.timeZone,numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso)).map(p=>[p.type,p.value]));return `${parts.year}.${parts.month}.${parts.day}`;}
export function shortDate(p){return dateText(p.updatedAt).slice(5);}
export function codexURL(p){
 if(typeof p.threadId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.threadId))return `codex://threads/${p.threadId}`;
 if(typeof p.workspacePath==='string'&&p.workspacePath.startsWith('/')&&!p.workspacePath.includes('\0'))return `codex://threads/new?path=${encodeURIComponent(p.workspacePath)}`;
 return '';
}
export function chatGPTURL(p){
 if(typeof p.chatUrl!=='string'||p.chatUrl.length>2000)return '';
 try{const u=new URL(p.chatUrl.trim());return u.protocol==='https:'&&u.hostname==='chatgpt.com'&&!u.port&&!u.username&&!u.password&&/^\/(?:g\/[^/]+\/)?c\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/?$/i.test(u.pathname)?u.origin+u.pathname.replace(/\/$/,''):'';}catch{return '';}
}
export const chatURL=p=>chatGPTURL(p)||codexURL(p);
