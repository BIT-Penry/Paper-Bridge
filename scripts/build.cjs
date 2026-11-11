const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const core=fs.readFileSync(path.join(root,'src/core.js'),'utf8');
const entry=fs.readFileSync(path.join(root,'src/main.js'),'utf8');
const marker="const core = require('./core');";
if(!entry.includes(marker))throw new Error('Core bundle marker missing');
fs.writeFileSync(path.join(root,'main.js'),entry.replace(marker,()=> 'const core = (() => { const module = { exports: {} };\n'+core+'\nreturn module.exports; })();'));
console.log('Built main.js');
