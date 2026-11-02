import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {resolveConfig} from '../scripts/config.mjs';
import {messages,createTranslator} from '../web/i18n.js';

test('both language packs cover the same controls, errors, and accessibility text',()=>{
 assert.deepEqual(Object.keys(messages.en).sort(),Object.keys(messages['zh-CN']).sort());
 for(const language of ['en','zh-CN']){
  const t=createTranslator(language);
  for(const key of Object.keys(messages.en))assert.ok(t(key).length>0);
  assert.throws(()=>t('missing-key'));
  assert.ok(t('changeState',{name:'Example',status:t('research')}).includes('Example'));
 }
});
test('language defaults change without translating explicit user branding',()=>{
 const en=resolveConfig({title:'My Board',timeZone:'UTC',language:'en'});
 const zh=resolveConfig({title:'My Board',timeZone:'UTC',language:'zh-CN'});
 assert.deepEqual(en.heading,['IDEA','INDEX']);assert.deepEqual(zh.heading,['项目','索引']);
 assert.equal(en.locale,'en-US');assert.equal(zh.locale,'zh-CN');
 assert.deepEqual(resolveConfig({...en,heading:['MY','BOARD']},'zh-CN').heading,['MY','BOARD']);
 assert.throws(()=>resolveConfig({title:'Board',language:'invalid'}));
});
test('both built pages serve localized HTML and matching demo content without bundling demo state',async()=>{
 const root=await mkdtemp(join(tmpdir(),'idea-flows-languages-'));
 try{
  for(const dir of ['web','worker','scripts','.openai'])await cp(new URL('../'+dir,import.meta.url),join(root,dir),{recursive:true});
  await writeFile(join(root,'package.json'),JSON.stringify({type:'module'}));
  await writeFile(join(root,'site.config.json'),JSON.stringify({title:'Test Board',language:'en',timeZone:'UTC'}));
  for(const language of ['en','zh-CN']){
   const result=spawnSync(process.execPath,['scripts/build.mjs','--language',language],{cwd:root,encoding:'utf8'});
   assert.equal(result.status,0,result.stderr);
   const source=await readFile(join(root,'dist/server/index.js'),'utf8');
   const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
   const page=await(await worker.fetch(new Request('https://board.example/'),{})).text();
   assert.ok(page.includes(`lang="${language}"`));assert.ok(page.includes(createTranslator(language)('linkTitle')));
   assert.ok(!page.includes('__I18N_'));
   const config=await(await worker.fetch(new Request('https://board.example/site.js'),{})).text();
   assert.ok(config.includes(`"language":"${language}"`));
   const examples=JSON.parse(await readFile(new URL(language==='en'?'../examples/ideas.en.json':'../examples/ideas.json',import.meta.url),'utf8'));
   for(const p of examples){assert.ok(p.name&&p.description&&p.progress);assert.ok(!source.includes(p.name));}
   if(language==='en')assert.ok(examples.every(p=>!/[\u3400-\u9fff]/.test(p.name+p.description+p.progress)));
  }
 }finally{await rm(root,{recursive:true,force:true});}
});

test('each README embeds real screenshot files for its own language',async()=>{
 const pictures=[];
 for(const [file,language] of [['README.md','en'],['README.zh-CN.md','zh-CN']]){
  const text=await readFile(new URL('../'+file,import.meta.url),'utf8');
  const references=[...text.matchAll(/!\[[^\]]*\]\((assets\/screenshots\/[^)]+)\)/g)].map(m=>m[1]);
  assert.equal(references.length,2);
  for(const path of references){assert.ok(path.endsWith('.'+language+'.jpg'));const bytes=await readFile(new URL('../'+path,import.meta.url));assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8);pictures.push(bytes);}
 }
 assert.notDeepEqual(pictures[0],pictures[2]);
});
