const assert=require('node:assert/strict');
const Module=require('node:module');
const {Element}=require('./dom.cjs');
const rows=[];
let opened;
class Modal {
  constructor(){this.contentEl=new Element();this.modalEl=new Element();}
  open(){opened=this;this.onOpen();}
  close(){this.closed=true;}
}
let stored={papersFolder:'Research/Papers',translationBaseUrl:'https://school.example/v1',unexpectedPrivateField:'do-not-persist'},persisted;
const secrets=new Map();
class Control {
  constructor(){this.inputEl=new Element('input');}
  setValue(value){this.value=value;return this;}
  setPlaceholder(){return this;}
  setDisabled(value){this.disabled=value;return this;}
  setButtonText(){return this;}
  addOptions(){return this;}
  onChange(callback){this.change=callback;return this;}
  onClick(callback){this.click=callback;return this;}
}
class Setting {
  constructor(parent){this.parent=parent;this.controls=[];rows.push(this);}
  setName(name){this.name=name;return this;}
  setDesc(){return this;}
  control(callback){const c=new Control();this.controls.push(c);callback(c);return this;}
  addText(c){return this.control(c);}
  addDropdown(c){return this.control(c);}
  addToggle(c){return this.control(c);}
  addButton(c){return this.control(c);}
}
class Plugin {
  async loadData(){return stored;}
  async saveData(data){persisted=JSON.parse(JSON.stringify(data));}
  addSettingTab(tab){this.tab=tab;}
  addCommand(){}
  addRibbonIcon(){}
}
const oldLoad=Module._load;
Module._load=function(name,...args){if(name==='obsidian')return {Plugin,FuzzySuggestModal:class{setPlaceholder(){}open(){opened=this;}},PluginSettingTab:class{constructor(app){this.app=app;this.containerEl=new Element();}},Setting,addIcon:()=>{},setIcon:()=>{},requestUrl:async opts=>{if(opts.url.endsWith('/models'))return {status:200,json:{data:[{id:'z-model'},{id:'a-model'},{id:'a-model'}]}};assert.equal(opts.url,'https://school.example/v1/chat/completions');assert.equal(JSON.parse(opts.body).model,'example-model');return {status:200,json:{choices:[{message:{content:'连接测试'}}]}};},Modal,Notice:class{},normalizePath:p=>p};return oldLoad.call(this,name,...args);};
const PaperBridge=require('../main');Module._load=oldLoad;
(async()=>{
  const plugin=new PaperBridge();plugin.app={secretStorage:{getSecret:key=>secrets.get(key),setSecret:(key,value)=>secrets.set(key,value)}};
  await plugin.onload();assert.equal(plugin.settings.translationEnabled,false);assert.equal(plugin.settings.papersFolder,'Research/Papers');assert(!('unexpectedPrivateField' in plugin.settings));
  plugin.tab.display();
  const row=name=>rows.findLast(r=>r.name===name);
  const file={path:'模板/复现.md'};plugin.app.vault={getMarkdownFiles:()=>[file],read:async()=>'## 复现步骤'};
  await row('自定义阅读模板').controls[0].click();assert.deepEqual(opened.getItems(),[file]);
  await opened.onChooseItem(file);assert.deepEqual(persisted.templatePaths,[file.path]);
  await row('默认阅读模板').controls[0].change(file.path);
  stored=persisted;const reopened=new PaperBridge();reopened.app=plugin.app;await reopened.onload();
  assert.equal(reopened.settings.defaultDepth,file.path);assert.deepEqual(reopened.settings.templatePaths,[file.path]);
  await row('自定义阅读模板').controls[0].click();assert.deepEqual(opened.getItems(),[]);
  await row('复现').controls[0].click();assert.deepEqual(persisted.templatePaths,[]);assert.equal(persisted.defaultDepth,'粗读');
  await row('模型').controls[0].change('example-model');assert.equal(persisted.providers[0].model,'example-model');assert(!JSON.stringify(persisted).includes('do-not-persist'));
  const providerFields=row('模型').parent;assert(!providerFields.hidden);await row('自动翻译摘要').controls[0].change(true);assert(!providerFields.hidden);await row('自动翻译摘要').controls[0].change(false);assert(!providerFields.hidden);
  const keyRow=row('API Key');assert.equal(keyRow.controls[0].inputEl.type,'password');
  keyRow.controls[0].change('fake-test-key');await row('验证并启用').controls[0].click();
  assert.equal(secrets.get('paper-bridge-api-key'),'fake-test-key');assert.equal(keyRow.controls[0].value,'');assert(!JSON.stringify(persisted).includes('fake-test-key'));
  assert.equal(plugin.settings.translationEnabled,true);
  assert.deepEqual(await plugin.fetchModels(plugin.currentProvider()),['a-model','z-model']);
  await plugin.addProvider({id:'deepseek',name:'DeepSeek',baseUrl:'https://api.deepseek.com',model:'deepseek-flash'});
  plugin.tab.display();
  await assert.rejects(()=>plugin.requestTranslation('sample',plugin.currentProvider()),/API Key/);
  const service=plugin.tab.containerEl.children.find(el=>el.classes.has('pb-ai-service'));
  const choices=service.children.find(el=>el.classes.has('pb-provider-grid')).children;
  assert.equal(choices.length,8);
  await choices[0].onclick();
  await row('已保存配置').controls[1].click();
  plugin.tab.display();
  assert(plugin.currentProvider().id.startsWith('custom-'));
  await row('已保存配置').controls[0].change('custom');
  assert.equal(plugin.currentProvider().model,'example-model');
  await row('Base URL').controls[0].change('https://other.example/v1');
  await assert.rejects(()=>plugin.requestTranslation('sample',plugin.currentProvider()),/当前地址/);
  await row('论文保存目录').controls[0].change('../outside');assert.equal(plugin.settings.papersFolder,'Research/Papers');assert.equal(row('论文保存目录').controls[0].inputEl.attrs['aria-invalid'],'true');
  const removed=plugin.currentProvider().id;
  await row('删除供应商').controls[0].click();
  assert(!plugin.settings.providers.some(p=>p.id===removed));
  assert.equal(secrets.get('paper-bridge-api-key'),'');
  stored=persisted;
  const restored=new PaperBridge();restored.app=plugin.app;await restored.onload();
  assert(!restored.settings.providers.some(p=>p.id===removed));
  for(const p of [...restored.settings.providers])await restored.removeProvider(p.id);
  stored=persisted;
  const empty=new PaperBridge();empty.app=plugin.app;await empty.onload();
  assert.equal(empty.settings.providers.length,0);
  empty.tab.display();
  console.log('PASS: standalone settings defaults, unknown fields discarded, keychain-only key storage, input cleared and invalid folder rejected.');
})().catch(error=>{console.error(error);process.exitCode=1;});
