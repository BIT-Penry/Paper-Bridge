const assert=require('node:assert/strict');
const Module=require('node:module');
const core=require('../src/core');
const htmlUrl='https://arxiv.org/html/2409.15634v2',imageUrl=htmlUrl+'/images/system_overview.png';
let requests=0;
const previousLoad=Module._load;
Module._load=function(name,...args){if(name==='obsidian')return{Plugin:class{},Modal:class{},Notice:class{},PluginSettingTab:class{},Setting:class{},normalizePath:p=>p,requestUrl:async({url})=>{
  requests++;if(url===htmlUrl)return{status:200,text:'fixture'};
  assert.equal(url,imageUrl);return{status:200,arrayBuffer:new Uint8Array([137,80,78,71,13,10,26,10]).buffer};
}};return previousLoad.call(this,name,...args);};
const PaperBridge=require('../main');Module._load=previousLoad;
global.DOMParser=class{parseFromString(){return{querySelectorAll:()=>[{
  querySelector:()=>({textContent:'Fig. 2: The proposed NavRL framework. Overview of the system.'}),
  querySelectorAll:()=>[{getAttribute:key=>key==='src'?'2409.15634v2/images/system_overview.png':null}],
  getAttribute:key=>key==='id'?'S3.F2':null
}]};}};
(async()=>{
  const plugin=new PaperBridge();plugin.settings={papersFolder:'论文笔记'};
  const note={path:'论文笔记/2024-NavRL/NavRL.md',basename:'NavRL',parent:{path:'论文笔记/2024-NavRL'}};
  const meta={title:'NavRL',authors:[],arxiv:'2409.15634v2',candidates:[]};
  let text=core.buildNote(meta,null,note.parent.path,'2026-11-11');const fm={},files=new Map();
  plugin.app={metadataCache:{getFileCache:()=>null},vault:{read:async()=>text,getAbstractFileByPath:p=>files.get(p),createFolder:async p=>files.set(p,{path:p}),createBinary:async(p,bytes)=>files.set(p,{bytes}),process:async(_,fn)=>{text=fn(text);}},fileManager:{processFrontMatter:async(_,fn)=>fn(fm)}};
  assert(await plugin.addMainFigure(note,meta,false));
  const expected=note.parent.path+'/images/main-figure-fig2.png';assert(files.has(expected));assert.equal(fm.cover,'[['+expected+']]');assert(text.includes('![['+expected+']]'));assert(![...files.keys()].some(p=>p.includes('-assets/')));
  const before=text;assert(await plugin.addMainFigure(note,meta,false));assert.equal(text,before);assert.equal(requests,2);
  console.log('PASS: new import with empty metadata cache saves figure directly in paper/images, sets cover and avoids duplicate insertion.');
})().catch(error=>{console.error(error);process.exitCode=1;});

const flowFigures = [
  ['2608.00635v2/teaser.png', 'Fig. 1: Overview of FlowPilot. The model outputs reference trajectories.'],
  ['2608.00635v2/mot_architecture.png', 'Fig. 2: Dual-stream MoT architecture.']
];
const parseFlow = () => ({querySelectorAll: () => flowFigures.map(([src, caption]) => ({
  querySelector: () => ({textContent: caption}),
  querySelectorAll: () => [{getAttribute: () => src}],
  getAttribute: () => ''
}))});
(async () => {
  const meta = {title:'FlowPilot: Real-Time World-Action Modeling for Agile UAV Navigation', arxiv:'2608.00635'};
  const candidates = await core.fetchFigures(meta, async () => ({text:''}), parseFlow);
  assert.equal(core.automaticFigure(candidates)?.number, '1');
  assert.equal(core.automaticFigure(candidates)?.url, 'https://arxiv.org/html/2608.00635v2/teaser.png');
  assert.equal(core.automaticFigure(core.parseFigureCandidates('', htmlUrl, parseFlow, 'Another: Study')), null);
})().catch(error => {console.error(error); process.exitCode=1;});
