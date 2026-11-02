import {spawn} from 'node:child_process';
import {parseArgs} from 'node:util';
const {values}=parseArgs({options:{language:{type:'string'},demo:{type:'boolean'}}});
const language=values.language?['--language',values.language]:[];
const build=spawn(process.execPath,['scripts/build.mjs',...language],{stdio:'inherit'});
build.on('exit',code=>{if(code!==0){process.exitCode=code||1;return;}const server=spawn(process.execPath,['scripts/dev.mjs',...language,...(values.demo?['--demo']:[])],{stdio:'inherit'});server.on('exit',code=>{process.exitCode=code||0;});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill(signal));});
