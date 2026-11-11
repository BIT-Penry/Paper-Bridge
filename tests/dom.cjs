class Element {
  constructor(tag='div',options={}){this.tag=tag;this.children=[];this.attrs={...options.attr};this.textContent=options.text||'';this.value='';this.hidden=false;this.disabled=false;this.classes=new Set((options.cls||'').split(' ').filter(Boolean));}
  createEl(tag,options={}){const child=new Element(tag,options);this.children.push(child);if(options.type)child.type=options.type;return child;}
  createDiv(options={}){return this.createEl('div',options);}
  addClass(value){this.classes.add(value);}
  setAttr(key,value){this.attrs[key]=String(value);}
  setAttribute(key,value){this.setAttr(key,value);}
  removeAttribute(key){delete this.attrs[key];}
  empty(){this.children=[];}
  focus(){this.focused=true;}
}
module.exports={Element};
