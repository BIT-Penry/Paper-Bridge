const assert=require('node:assert/strict');
const Module=require('node:module');
const {Element}=require('./dom.cjs');
const rows=[];
let stored={papersFolder:'Research/Papers',unexpectedPrivateField:'do-not-persist'},persisted;
const secrets=new Map();
class Control {
  constructor(){this.inputEl=new Element('input');}
  setValue(value){this.value=value;return this;}
  setPlaceholder(){return this;}
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
Module._load=function(name,...args){if(name==='obsidian')return {Plugin,PluginSettingTab:class{constructor(app){this.app=app;this.containerEl=new Element();}},Setting,Modal:class{},Notice:class{},normalizePath:p=>p};return oldLoad.call(this,name,...args);};
const PaperBridge=require('../main');Module._load=oldLoad;
(async()=>{
  const plugin=new PaperBridge();plugin.app={secretStorage:{getSecret:key=>secrets.get(key),setSecret:(key,value)=>secrets.set(key,value)}};
  await plugin.onload();assert.equal(plugin.settings.translationEnabled,false);assert.equal(plugin.settings.papersFolder,'Research/Papers');assert(!('unexpectedPrivateField' in plugin.settings));
  plugin.tab.display();
  const row=name=>rows.find(r=>r.name===name);
  await row('翻译模型').controls[0].change('example-model');assert.equal(persisted.translationModel,'example-model');assert(!JSON.stringify(persisted).includes('do-not-persist'));
  const providerFields=row('翻译模型').parent;assert(providerFields.hidden);await row('自动翻译摘要').controls[0].change(true);assert(!providerFields.hidden);await row('自动翻译摘要').controls[0].change(false);assert(providerFields.hidden);
  const keyRow=row('API Key');assert.equal(keyRow.controls[0].inputEl.type,'password');
  keyRow.controls[0].change('fake-test-key');keyRow.controls[1].click();
  assert.equal(secrets.get('paper-bridge-api-key'),'fake-test-key');assert.equal(keyRow.controls[0].value,'');assert(!JSON.stringify(persisted).includes('fake-test-key'));
  await row('论文保存目录').controls[0].change('../outside');assert.equal(plugin.settings.papersFolder,'Research/Papers');assert.equal(row('论文保存目录').controls[0].inputEl.attrs['aria-invalid'],'true');
  console.log('PASS: standalone settings defaults, unknown fields discarded, keychain-only key storage, input cleared and invalid folder rejected.');
})().catch(error=>{console.error(error);process.exitCode=1;});
