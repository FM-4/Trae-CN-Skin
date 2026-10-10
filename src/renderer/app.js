import { defaults, presets, validateTheme } from '../shared/theme.js';
const $ = selector => document.querySelector(selector);
let theme = { ...defaults }, scene = 'home', busy = false, toastTimer;
const fields = [
  ['intensity','Agent 首页背景','%'],['taskIntensity','任务对话背景','%'],['surfaceOpacity','面板不透明度','%'],
  ['blur','玻璃模糊','px'],['radius','面板圆角','px'],['imageWidth','图片覆盖宽度','%'],['focusX','图片水平焦点','%'],['focusY','图片垂直焦点','%']
];
const limits = { intensity:[0,70],taskIntensity:[0,50],surfaceOpacity:[65,100],blur:[0,24],radius:[0,24],imageWidth:[30,80],focusX:[0,100],focusY:[0,100] };
for (const [key,label,unit] of fields) {
  const wrapper = document.createElement('label'); wrapper.className = 'slider-field';
  const heading = document.createElement('span'); heading.className = 'slider-heading';
  const text = document.createElement('span'); text.textContent = label;
  const output = document.createElement('output'); output.id = key+'-value'; output.htmlFor = key;
  const input = document.createElement('input'); input.type='range'; input.id=key; input.min=limits[key][0]; input.max=limits[key][1]; input.step=1;
  input.addEventListener('input',() => { theme[key]=Number(input.value); render(); dirty(); });
  heading.append(text,output); wrapper.append(heading,input); $('#sliders').append(wrapper);
}
function dirty() { $('#save-state').textContent = '有未保存的调整'; }
function render() {
  $('#theme-name').textContent=theme.name; $('#accent').value=theme.accent;
  for (const [key,,unit] of fields) { $('#'+key).value=theme[key]; $('#'+key+'-value').textContent=theme[key]+unit; }
  const preview=$('#preview'); preview.dataset.scene=scene;
  const vars = { bg:theme.background,surface:theme.surface,text:theme.text,muted:theme.muted,accent:theme.accent,opacity:(scene==='home'?theme.intensity:theme.taskIntensity)/100,'surface-alpha':theme.surfaceOpacity+'%',radius:theme.radius+'px',blur:theme.blur+'px','image-width':theme.imageWidth+'%','focus-x':theme.focusX+'%','focus-y':theme.focusY+'%' };
  for (const [key,value] of Object.entries(vars)) preview.style.setProperty('--'+key,value);
  for (const [key,value] of Object.entries({bg:theme.background,surface:theme.surface,text:theme.text,muted:theme.muted,accent:theme.accent})) $('#swatch-'+key).style.background=value;
  document.querySelectorAll('[data-preset]').forEach(button=>{ button.classList.toggle('selected',button.dataset.preset===theme.id);button.setAttribute('aria-pressed',String(button.dataset.preset===theme.id)); });
}
function notify(message) { clearTimeout(toastTimer); $('#toast').textContent=message; $('#toast').hidden=false; toastTimer=setTimeout(()=>$('#toast').hidden=true,10000); }
function status(value) {
  $('#status').textContent=value.message; $('#status-dot').dataset.phase=value.phase;
  $('#diagnostics').textContent=value.windows?.length ? value.windows.map(window => `窗口 ${window.id}\n适配：${window.level==='full'?'关键部件已命中':'基础外观（部分部件缺失）'}\n${Object.entries(window.parts).map(([part,count])=>`${part}: ${count}`).join(' · ')}`).join('\n\n') : '尚未获取窗口适配信息';
}
async function action(callback) {
  if(busy)return; busy=true;
  const controls=[...document.querySelectorAll('button,input')]; controls.forEach(control=>control.disabled=true);
  try { if(!window.skin)throw new Error('请通过 Electron 打开管理器。当前页面没有桌面连接。'); await callback(); }
  catch(error){notify(error.message);}
  finally{busy=false;controls.forEach(control=>control.disabled=false);}
}
async function call(promise) { const result=await promise; if(!result.ok)throw new Error(result.error);return result.value; }
document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.page').forEach(page=>page.hidden=page.id!==button.dataset.page);
  document.querySelectorAll('[data-page]').forEach(item=>item.classList.toggle('selected',item===button));
  $('#page-label').textContent=button.textContent.trim().slice(1).trim();
}));
document.querySelectorAll('[data-scene]').forEach(button=>{ if(button.tagName!=='BUTTON')return; button.addEventListener('click',()=>{
  scene=button.dataset.scene; document.querySelectorAll('.segmented button').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button));});render();
}); });
$('#toggle-mock-tools').addEventListener('click',event=>{
  const open=$('#preview').dataset.toolsOpen!=='true'; $('#preview').dataset.toolsOpen=String(open); event.currentTarget.setAttribute('aria-expanded',String(open));
});
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{theme={...presets[button.dataset.preset]};render();dirty();}));
$('#accent').addEventListener('input',event=>{theme.accent=event.target.value;render();dirty();});
$('#reset').addEventListener('click',()=>{theme={...(presets[theme.id]||defaults)};render();dirty();});
$('#save').addEventListener('click',()=>action(async()=>{ theme=await call(window.skin.save(validateTheme(theme)));render();$('#save-state').textContent='已保存到本地';notify('参数已保存。应用到 TRAE CN 需要单独点击应用。'); }));
$('#apply').addEventListener('click',()=>action(async()=>{status(await call(window.skin.apply(validateTheme(theme))));}));
$('#restore').addEventListener('click',()=>action(async()=>{status(await call(window.skin.restore()));}));
$('#choose').addEventListener('click',()=>action(async()=>{$('#executable').textContent=await call(window.skin.chooseExecutable())||'尚未找到客户端';}));
$('#connect').addEventListener('click',()=>action(async()=>{status(await call(window.skin.connect()));}));
render();
if(window.skin){
  window.skin.onStatus(status);
  action(async()=>{const state=await call(window.skin.read());theme=validateTheme(state.config.theme);$('#executable').textContent=state.config.executable||'尚未找到客户端，请手动选择';status(state.status);render();});
}
