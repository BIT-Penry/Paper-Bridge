const assert=require('node:assert/strict'),Module=require('node:module');
const {Element}=require('./dom.cjs');
let modal;
const previous=Module._load;
Module._load=function(name,...args){if(name==='obsidian')return{
  Plugin:class{async loadData(){return null;}addSettingTab(){}addCommand(){}addRibbonIcon(_,__,callback){this.openImport=callback;}},
  addIcon:()=>{},setIcon:()=>{},PluginSettingTab:class{},Setting:class{},Notice:class{},normalizePath:p=>p,
  Modal:class{constructor(app){this.app=app;this.contentEl=new Element();this.modalEl=new Element();modal=this;}open(){this.onOpen();}close(){this.closed=true;}}
};return previous.call(this,name,...args);};
const PaperBridge=require('../main');Module._load=previous;
(async()=>{
  const plugin=new PaperBridge();plugin.app={};await plugin.onload();plugin.openImport();
  assert(modal.submit.disabled);assert(modal.source.focused);
  modal.source.value='invalid-link';modal.source.oninput();assert(!modal.submit.disabled);
  await modal.run();assert(modal.feedback.textContent.includes('请输入 arXiv'));assert.equal(modal.feedback.attrs.role,'alert');assert.equal(modal.source.value,'invalid-link');assert.equal(modal.source.attrs['aria-invalid'],'true');assert(!modal.submit.disabled);
  modal.source.value='2409.15634v2';modal.source.oninput();assert(!('aria-invalid' in modal.source.attrs));
  const existing={path:'existing.md'};let resolveOpen,opens=0;
  plugin.findExisting=()=>existing;plugin.open=()=>{opens++;return new Promise(resolve=>{resolveOpen=resolve;});};
  const importing=modal.run();assert(modal.submit.disabled);assert(modal.source.disabled);assert.equal(modal.submit.textContent,'正在导入…');
  await modal.run();assert.equal(opens,1);resolveOpen();await importing;
  assert(modal.closed);assert(!modal.source.disabled);assert.equal(modal.submit.textContent,'导入论文');
  plugin.openImport();let prevented=false;modal.source.value='invalid-link';modal.source.onkeydown({key:'Enter',isComposing:false,preventDefault(){prevented=true;}});await Promise.resolve();assert(prevented);assert(modal.feedback.textContent.includes('请输入 arXiv'));
  console.log('PASS: empty input disabled, invalid input retained and announced, correction clears error, busy form prevents duplicate submission, native Enter submits.');
})().catch(error=>{console.error(error);process.exitCode=1;});
