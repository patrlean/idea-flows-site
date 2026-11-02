export const defaults={
 en:{locale:'en-US',description:'Ideas, research, and works in progress — from a thought to something shipped.',eyebrow:'IDEAS / IN PROGRESS',heading:['IDEA','INDEX']},
 'zh-CN':{locale:'zh-CN',description:'记录想法、调研与作品进展，从构思到交付。',eyebrow:'想法 / 正在发生',heading:['项目','索引']}
};
export const messages={
 en:{
  idea:'Idea',research:'Research',dev:'Building',live:'Live',discarded:'Archived',completed:'Completed',archive:'Archive',
  allProjects:'Show all projects',filters:'Filter projects by status',liveFilter:'Live / Done',ideasFilter:'Ideas',backToAll:'← All projects',updated:'Updated {date}',reading:'Loading projects…',connecting:'Connecting…',connected:'Connected',disconnected:'Offline · last sync kept',syncLabel:'ChatGPT / Codex sync',drawer:'Archive',archiveCount:'Archived {count} →',
  openChat:'Open {app} ↗',noChat:'No linked conversation',visitSite:'Visit site ↗',associateChat:'Link chat',changeAssociation:'Change link',associateWeb:'Link web chat',associationLabel:'{action} the ChatGPT conversation for {name}',linkAction:'Link',changeAction:'Change',openProject:'Open {name} in {app}',changeState:'Change {name} status, currently {status}',stateOptions:'Status options for {name}',
  updatedAgo:'Updated {days}d ago',inactiveDays:'Inactive for {days}d',archiveProject:'Archive {name}',workingOn:'In progress → ',waitingUpdate:'Waiting for the next Codex update',activity:'Activity {level} / 5',researchProgress:'Research notes → ',researchPending:'Gathering sources and testing the idea',
  emptyLive:'Nothing shipped yet. Verified deployments or completed work will appear here.',emptyDev:'No projects in development yet.',emptyResearch:'No research in progress. Literature reviews, comparisons, and feasibility checks will appear here.',emptyIdeas:'No ideas here yet.',emptyBoard:'Start with a conversation. Connect this Site’s ChatGPT plugin or configure a Codex hook to collect ideas and progress here.',restore:'Restore project →',emptyArchive:'The archive is empty.',saveStateError:'Could not save the status. Please try again.',invalidChat:'Paste the conversation URL from ChatGPT’s address bar (/c/…), not a share or website link.',removedChat:'Chat link removed',linkedChat:'ChatGPT conversation linked',networkError:'Connection interrupted. Your change has not been saved. Please retry.',loginExpired:'Your session expired. Refresh and sign in again.',saveError:'Could not save the change. Please try again.',
  closeArchive:'Close archive',archiveTitle:'Archived ideas',archiveIntro:'Set aside for now, kept for later. Restore an idea here or pick it up in Codex.',linkTitle:'Link a ChatGPT conversation',closeLink:'Close chat linking',chatURL:'Conversation URL',chatHelp:'Copy the conversation URL from ChatGPT’s address bar.',removeLink:'Remove link',saveLink:'Save link'
 },
 'zh-CN':{
  idea:'想法',research:'调研',dev:'开发中',live:'已上线',discarded:'已归档',completed:'已完成',archive:'归档',
  allProjects:'显示全部项目',filters:'项目状态筛选',liveFilter:'已上线 / 完成',ideasFilter:'想法',backToAll:'← 全部项目',updated:'更新于 {date}',reading:'正在读取项目…',connecting:'正在连接…',connected:'云端已连接',disconnected:'连接中断 · 保留上次同步',syncLabel:'ChatGPT / Codex 同步',drawer:'抽屉',archiveCount:'已归档 {count} →',
  openChat:'打开 {app} ↗',noChat:'尚未关联对话',visitSite:'访问站点 ↗',associateChat:'关联对话',changeAssociation:'更改关联',associateWeb:'关联网页对话',associationLabel:'{action} {name} 的 ChatGPT 对话',linkAction:'关联',changeAction:'更改',openProject:'在 {app} 中打开 {name}',changeState:'更改 {name} 的状态，当前{status}',stateOptions:'{name} 的状态选项',
  updatedAgo:'{days} 天前推进',inactiveDays:'{days} 天未动',archiveProject:'归档 {name}',workingOn:'正在做 → ',waitingUpdate:'等待下一次 Codex 更新',activity:'活跃度 {level} / 5',researchProgress:'最近调研 → ',researchPending:'正在收集资料与验证想法',
  emptyLive:'还没有已上线或完成的项目。验证部署或最终作品后，会显示在这里。',emptyDev:'还没有开发中的项目。',emptyResearch:'还没有调研中的项目。查资料、做竞品分析或验证可行性时，会归到这里。',emptyIdeas:'还没有构思中的项目。',emptyBoard:'从一次对话开始。连接本站的 ChatGPT 插件，或配置 Codex hook 后，你的想法和进展会显示在这里。',restore:'恢复项目 →',emptyArchive:'抽屉是空的。',saveStateError:'未能保存状态，请重试。',invalidChat:'请粘贴 ChatGPT 地址栏里的对话链接（/c/…），不是分享或站点链接。',removedChat:'已移除网页对话关联',linkedChat:'已关联 ChatGPT 对话',networkError:'连接中断，修改尚未保存，请重试。',loginExpired:'登录已过期，请刷新后重新登录。',saveError:'修改未能保存，请稍后重试。',
  closeArchive:'关闭归档抽屉',archiveTitle:'已归档的想法',archiveIntro:'暂时放下，也保留来过的痕迹。可以直接恢复，或在 Codex 中继续。',linkTitle:'关联 ChatGPT 对话',closeLink:'关闭对话关联',chatURL:'对话链接',chatHelp:'从 ChatGPT 地址栏复制对话链接并粘贴。',removeLink:'移除关联',saveLink:'保存关联'
 }
};
export function createTranslator(language){
 const dictionary=messages[language];if(!dictionary)throw new Error('Supported languages: en, zh-CN');
 return (key,values={})=>{if(!(key in dictionary))throw new Error('Missing translation: '+key);return dictionary[key].replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''));};
}
