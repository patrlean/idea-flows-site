import {writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {readConfig} from './config.mjs';
const {values}=parseArgs({options:{title:{type:'string'},eyebrow:{type:'string'},timezone:{type:'string'},help:{type:'boolean'}}});
if(values.help){console.log('npm run setup -- --title "My Ideas" --eyebrow "MY / IDEAS" --timezone "Asia/Shanghai"');process.exit(0);}
const previous=await readConfig();
const next={...previous,...(values.title?{title:values.title}:{}),...(values.eyebrow?{eyebrow:values.eyebrow}:{}),...(values.timezone?{timeZone:values.timezone}:{})};
new Intl.DateTimeFormat(next.locale,{timeZone:next.timeZone});
if(Object.values(values).some(v=>typeof v==='string'&&(!v.trim()||v.length>500)))throw new Error('Use non-empty values under 500 characters');
await writeFile('site.config.json',JSON.stringify(next,null,2)+'\n');
console.log('Site configured. Run npm run dev for a private local preview.');
