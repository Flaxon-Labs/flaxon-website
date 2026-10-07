/* Browser-only editor and deliberately conservative static route inspection. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const editor=$('pg-editor'), highlight=$('pg-highlight'), output=$('pg-output'), status=$('pg-status');
let examples, files, active, selected='api';
const key=()=>`flaxon.playground.v1.${selected}`;
function paint(){
 const code=editor.value; highlight.firstElementChild.replaceChildren();
 const pattern=/(#[^\n]*|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:from|import|async|await|def|return|class|if|else|try|finally|export|default|const|let|function|True|False|None)\b|\b\d+\b)/g;
 let end=0;
 for(const m of code.matchAll(pattern)){
  highlight.firstElementChild.append(document.createTextNode(code.slice(end,m.index)));
  const span=document.createElement('span'); span.textContent=m[0];
  span.className='pg-token-'+(/^(#|\/\/)/.test(m[0])?'comment':/^["']/.test(m[0])?'string':/^\d/.test(m[0])?'number':'keyword');
  highlight.firstElementChild.append(span); end=m.index+m[0].length;
 }
 highlight.firstElementChild.append(document.createTextNode(code.slice(end)+'\n'));
 highlight.scrollTop=editor.scrollTop; highlight.scrollLeft=editor.scrollLeft;
}
function save(){files[active]=editor.value;try{localStorage.setItem(key(),JSON.stringify(files));status.textContent='Draft saved in this browser.';}catch{status.textContent='Browser storage unavailable. Download your project to keep changes.';}paint();}
function openFile(name){active=name; editor.value=files[name];editor.setAttribute('aria-label',`Edit ${name}`);paint();for(const b of $('pg-tabs').children){b.setAttribute('aria-selected',String(b.textContent===name));b.tabIndex=b.textContent===name?0:-1;}}
function load(){
 files={...examples[selected].files};let restored=false;
 try{const saved=JSON.parse(localStorage.getItem(key()));if(saved&&Object.keys(files).every(n=>typeof saved[n]==='string'&&saved[n].length<=200000)){for(const n of Object.keys(files))files[n]=saved[n];restored=true;}}catch{}
 $('pg-tabs').replaceChildren();for(const name of Object.keys(files)){const b=document.createElement('button');b.type='button';b.role='tab';b.textContent=name;b.addEventListener('click',()=>openFile(name));b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=[...$('pg-tabs').children];let i=tabs.indexOf(b);i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[i].click();tabs[i].focus();}});$('pg-tabs').append(b);}
 openFile(Object.keys(files)[0]);status.textContent=restored?'Saved draft restored.':'Example loaded. Changes are saved automatically.';output.textContent='Click Inspect routes to inspect all Python files.';output.classList.remove('pg-error');
}
function inspect(project){
 const routes=[], warnings=[]; let appFound=false;
 for(const [file,code] of Object.entries(project)){if(!file.endsWith('.py'))continue;
 const aliases=[...code.matchAll(/\b(\w+)\s*=\s*(Flaxon|FlaxonModule)\s*\(/g)].map(m=>m[1]);appFound ||= /\bFlaxon\s*\(/.test(code);
 const lines=code.split('\n');
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/^\s*@(\w+)\.(get|post|put|patch|delete|head|options|websocket|route)\s*\((.*)$/);if(!m||!aliases.includes(m[1]))continue;
  let args=m[3], j=i;while(!args.includes(')')&&j+1<lines.length&&j-i<20)args+=' '+lines[++j].trim();
  const path=args.match(/^\s*(["'])(.*?)\1/);if(!path||!args.includes(')')){warnings.push(`${file}:${i+1}: Use a quoted path and close the decorator parentheses.`);continue;}
  let k=j+1;while(k<lines.length&&(/^\s*@/.test(lines[k])||!lines[k].trim()||/^\s*#/.test(lines[k])))k++;
  const fn=(lines[k]||'').match(/^\s*(?:async\s+)?def\s+(\w+)\s*\(/);if(!fn){warnings.push(`${file}:${i+1}: Route decorator needs a following function definition.`);continue;}
  if(!path[2].startsWith('/')){warnings.push(`${file}:${i+1}: Route paths must begin with /.`);continue;}
  let methods=[m[2].toUpperCase()];if(m[2]==='route'){const list=args.match(/methods\s*=\s*[\[{(]([^\]})]*)/);if(list)methods=[...list[1].matchAll(/["']([A-Za-z]+)["']/g)].map(x=>x[1].toUpperCase());else methods=['GET'];if(!methods.length){warnings.push(`${file}:${i+1}: Cannot inspect dynamic methods.`);continue;}}
  routes.push({file,line:i+1,owner:m[1],path:path[2],methods,handler:fn[1]});
 }
 }
 if(!appFound)warnings.unshift('app.py: Create an application with app = Flaxon("my-app").');
 if(!routes.length)warnings.push('No literal route decorators found. Inspect @app.get("/") or module routes above functions.');
 if(Object.values(project).some(c=>c.includes('mount_module(')))warnings.push('Module paths below are relative to their module. mount_module prefixes are not resolved by this static inspector.');
 return {routes,warnings,notice:'Static inspection; this is not Python syntax validation or execution.'};
}
function download(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
// ZIP STORE format: portable offline project download, no third-party library.
function zip(project){const enc=new TextEncoder(),parts=[],central=[];let offset=0;const u16=(d,o,n)=>d.setUint16(o,n,true),u32=(d,o,n)=>d.setUint32(o,n>>>0,true);const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
for(const [name,value]of Object.entries(project)){const n=enc.encode(name),b=enc.encode(value),sum=crc(b),h=new Uint8Array(30+n.length),v=new DataView(h.buffer);u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x800);u16(v,12,33);u32(v,14,sum);u32(v,18,b.length);u32(v,22,b.length);u16(v,26,n.length);h.set(n,30);parts.push(h,b);const c=new Uint8Array(46+n.length),d=new DataView(c.buffer);u32(d,0,0x02014b50);u16(d,4,20);u16(d,6,20);u16(d,8,0x800);u16(d,14,33);u32(d,16,sum);u32(d,20,b.length);u32(d,24,b.length);u16(d,28,n.length);u32(d,42,offset);c.set(n,46);central.push(c);offset+=h.length+b.length;}
const size=central.reduce((n,c)=>n+c.length,0),end=new Uint8Array(22),d=new DataView(end.buffer);u32(d,0,0x06054b50);u16(d,8,central.length);u16(d,10,central.length);u32(d,12,size);u32(d,16,offset);return new Blob([...parts,...central,end],{type:'application/zip'});}
editor.addEventListener('input',save);editor.addEventListener('scroll',paint);editor.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();editor.setRangeText('    ',editor.selectionStart,editor.selectionEnd,'end');save();}});
$('pg-example').addEventListener('change',e=>{selected=e.target.value;load();});
$('pg-inspect').addEventListener('click',()=>{const result=inspect(files);output.textContent=JSON.stringify(result,null,2);output.classList.toggle('pg-error',!!result.warnings.length);status.textContent=`Inspected ${result.routes.length} routes; ${result.warnings.length} notices.`;});
$('pg-reset').addEventListener('click',()=>{if(confirm('Discard this example’s saved changes and restore its starter files?')){try{localStorage.removeItem(key());}catch{}load();}});
$('pg-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(editor.value);status.textContent=`Copied ${active}.`;}catch{editor.focus();editor.select();status.textContent='Press Ctrl+C (or Command+C) to copy the selected file.';}});
$('pg-download').addEventListener('click',()=>download(active.split('/').pop(),new Blob([editor.value],{type:'text/plain;charset=utf-8'})));
$('pg-project').addEventListener('click',()=>download(`flaxon-${selected}.zip`,zip(files)));
$('pg-theme').addEventListener('click',()=>window.flaxonDarkMode.toggle());
fetch('data/playground-examples.json').then(r=>{if(!r.ok)throw Error('Examples unavailable');return r.json();}).then(data=>{examples=data;load();}).catch(()=>{status.textContent='Could not load examples. Reload the page to retry.';});
})();
