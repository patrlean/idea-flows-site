import {readFile,writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {resolveConfig} from './config.mjs';
const {values}=parseArgs({options:{title:{type:'string'},eyebrow:{type:'string'},timezone:{type:'string'},language:{type:'string'},help:{type:'boolean'}}});
if(values.help){console.log('npm run setup -- --title "My Ideas" --language en --timezone "UTC"');process.exit(0);}
const previous=JSON.parse(await readFile('site.config.json','utf8'));
const next={...previous,...(values.title?{title:values.title}:{}),...(values.eyebrow?{eyebrow:values.eyebrow}:{}),...(values.timezone?{timeZone:values.timezone}:{}),...(values.language?{language:values.language}:{})};
if(Object.values(values).some(v=>typeof v==='string'&&(!v.trim()||v.length>500)))throw new Error('Use non-empty values under 500 characters');
resolveConfig(next);
await writeFile('site.config.json',JSON.stringify(next,null,2)+'\n');
console.log('Site configured. Run npm run dev for a private local preview.');
