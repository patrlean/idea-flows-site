import test from 'node:test';
import assert from 'node:assert/strict';
import {codexURL,chatURL,chatGPTURL} from '../web/data.js';

test('existing source chat takes precedence over workspace fallback',()=>{
 const threadId='01a0838e-614c-7150-b953-cb160cd2dc82';
 assert.equal(codexURL({threadId,workspacePath:'/example/project'}),`codex://threads/${threadId}`);
});
test('a real ChatGPT source opens the web chat and rejects unsafe or unrelated destinations',()=>{
 const uuid='6ae7f45f-9ac0-8191-af20-c9155810df24',chatUrl='https://chatgpt.com/c/'+uuid;
 assert.equal(chatURL({chatUrl,threadId:uuid}),chatUrl);
 assert.equal(chatGPTURL({chatUrl:'https://chatgpt.com/g/g-example/c/'+uuid}),'https://chatgpt.com/g/g-example/c/'+uuid);
 for(const url of ['javascript:alert(1)','https://attacker.test/c/'+uuid,'https://chatgpt.com.attacker.test/c/'+uuid,'https://user@chatgpt.com/c/'+uuid,'https://chatgpt.com/c/not-a-real-id'])assert.equal(chatGPTURL({chatUrl:url}),'');
 assert.equal(chatURL({chatUrl:'https://attacker.test',threadId:uuid}),`codex://threads/${uuid}`);
 assert.equal(chatGPTURL({chatUrl:'  '+chatUrl+'/?model=example#notes  '}),chatUrl);
 assert.equal(chatGPTURL({chatUrl:'https://chatgpt.com/share/'+uuid}),'');
});
test('missing chat opens a new composer in the known workspace with an encoded path',()=>{
 const path='/example/城市 & models';
 const url=new URL(codexURL({threadId:'',workspacePath:path}));
 assert.equal(url.host,'threads');assert.equal(url.pathname,'/new');assert.equal(url.searchParams.get('path'),path);
 assert.equal(url.searchParams.has('projectId'),false);
});
test('project id alone and invalid destinations do not produce broken or unsafe links',()=>{
 for(const p of [{projectId:'internal-project-id'},{threadId:'-'.repeat(36)},{workspacePath:'javascript:alert(1)'},{workspacePath:'relative/project'},{workspacePath:'/project\0suffix'},{}])assert.equal(codexURL(p),'');
});
