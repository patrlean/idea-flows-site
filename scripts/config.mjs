import {readFile} from 'node:fs/promises';
export async function readConfig(root=process.cwd()){
 const config=JSON.parse(await readFile(root+'/site.config.json','utf8'));
 for(const key of ['title','description','eyebrow','locale','timeZone'])if(typeof config[key]!=='string'||!config[key].trim()||config[key].length>500)throw new Error(`Invalid site.config.json field: ${key}`);
 if(!Array.isArray(config.heading)||config.heading.length<1||config.heading.length>3||config.heading.some(s=>typeof s!=='string'||!s.trim()||s.length>80))throw new Error('heading must contain 1–3 short lines');
 new Intl.DateTimeFormat(config.locale,{timeZone:config.timeZone});
 return Object.fromEntries(['title','description','eyebrow','heading','locale','timeZone'].map(key=>[key,config[key]]));
}
export const html=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const js=value=>JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
