import {t} from './locale.js';
const KEY='idea-flows-site-v2-cache';
export function load(){try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.version===2&&Array.isArray(saved.ideas))return {...saved,connection:t('connecting')};}catch{}return {version:2,revision:-1,ideas:[],lastSaved:null,connection:t('connecting')};}
export function cache(state){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
async function request(path,options={}){let response;try{response=await fetch(path,{...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...options.headers}});}catch{throw new Error(t('networkError'));}if(!response.ok){if(response.status===401)throw new Error(t('loginExpired'));throw new Error(t('saveError'));}return response.json();}
export const fetchState=()=>request('/api/ideas');
export const changeStatus=(id,status)=>request(`/api/ideas/${encodeURIComponent(id)}/status`,{method:'PATCH',body:JSON.stringify({status})});
export const changeChatLink=(id,chatUrl)=>request(`/api/ideas/${encodeURIComponent(id)}/chat-link`,{method:'PATCH',body:JSON.stringify({chatUrl})});
