import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile('.openai/hosting.json','utf8'));
if(typeof config.project_id!=='string'||!/^appgprj_[a-zA-Z0-9]+$/.test(config.project_id))throw new Error('Register your own Site with Sites first, then persist its exact returned project_id. No Site identity is bundled in this template.');
if(config.r2!=='BUCKET'||!config.capabilities?.includes('mcp'))throw new Error('Keep the BUCKET R2 binding and mcp capability for the board and Site plugin.');
console.log('Deployment identity and storage declarations are ready.');
