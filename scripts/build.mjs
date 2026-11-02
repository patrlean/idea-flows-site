import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {readConfig,html,js} from './config.mjs';
import {parseArgs} from 'node:util';
import {createTranslator} from '../web/i18n.js';
const {values}=parseArgs({options:{language:{type:'string'}}});
const config=await readConfig(process.cwd(),values.language),t=createTranslator(config.language);
const assets={};
for(const [name,type] of Object.entries({'index.html':'text/html; charset=utf-8','styles.css':'text/css; charset=utf-8','app.js':'text/javascript; charset=utf-8','data.js':'text/javascript; charset=utf-8','store.js':'text/javascript; charset=utf-8','site.js':'text/javascript; charset=utf-8','locale.js':'text/javascript; charset=utf-8','i18n.js':'text/javascript; charset=utf-8'})){
 let body=await readFile('web/'+name,'utf8');
 if(name==='index.html')body=body.replaceAll('__SITE_TITLE__',html(config.title)).replaceAll('__SITE_DESCRIPTION__',html(config.description)).replaceAll('__LANG__',config.language).replace(/__I18N_(\w+)__/g,(_,key)=>html(t(key)));
 if(name==='site.js')body='export const site = '+js(config)+';\n';
 assets['/'+name]={body,type};
}
// No local data is embedded. Fresh storage starts empty; redeployments retain hosted data.
const source=(await readFile('worker/index.js','utf8')).replace('/*__ASSETS__*/ {}',JSON.stringify(assets)).replace('/*__PROJECTS__*/ []','[]');
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',source);
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log('Built Sites Worker with embedded assets and an empty initial board.');
