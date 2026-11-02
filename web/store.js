const KEY='idea-flows-site-v2-cache';
export function load(){try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.version===2&&Array.isArray(saved.ideas))return {...saved,connection:'正在连接…'};}catch{}return {version:2,revision:-1,ideas:[],lastSaved:null,connection:'正在连接…'};}
export function cache(state){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
async function request(path,options={}){let response;try{response=await fetch(path,{...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...options.headers}});}catch{throw new Error('连接中断，修改尚未保存，请重试。');}if(!response.ok){if(response.status===401)throw new Error('登录已过期，请刷新后重新登录。');throw new Error('修改未能保存，请稍后重试。');}return response.json();}
export const fetchState=()=>request('/api/ideas');
export const changeStatus=(id,status)=>request(`/api/ideas/${encodeURIComponent(id)}/status`,{method:'PATCH',body:JSON.stringify({status})});
export const changeChatLink=(id,chatUrl)=>request(`/api/ideas/${encodeURIComponent(id)}/chat-link`,{method:'PATCH',body:JSON.stringify({chatUrl})});
