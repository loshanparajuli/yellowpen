import './style.css';
import { textTiming } from '../text/timing';
import { styleSchema } from '../core/project';
import type { Region } from '../core/project';
import { backdropSchema, screenshotRect } from '../render/backdrop';
import { createProject } from '../core/project';
import { decodeImage } from '../storage/image';
import { presets,templateSchema,readTemplates,saveTemplate,logoData } from '../text/template';
import type { TextTemplate } from '../text/template';
import { composeText, recognizeImage } from '../text/document';
import { Renderer } from '../render/renderer';
import { exportInWorker } from '../export/client';
import { saveLocal, loadLocal, packProject, unpackProject } from '../storage/project-store';
import type { Project } from '../core/project';
const sample='Video editing is becoming part of everyday storytelling.\nThe tools are getting faster. The ideas still matter.\n\nA small detail can change the entire story.\nGive the important words a moment of their own.';
document.querySelector('#app')!.innerHTML=`
<header><a class="brand" href="/" aria-label="yellowpen home"><img src="/favicon.svg" width="30" height="30" alt="">yellowpen</a><button id="export" class="primary header-export" disabled title="Animate your selection to enable export">Export <span>4K · 60 FPS</span> ↓</button></header><main>
<div class="workspace"><aside><label class="drop" id="drop" tabindex="0"><span class="plus">＋</span><strong>Drop your screenshot</strong><span>or click to browse · PNG / JPG</span><input id="file" type="file" accept="image/png,image/jpeg" hidden></label><small id="native">Checking local text recognition…</small><button id="cancel-ocr" hidden>Cancel reading</button>
<button id="paste-image">Paste screenshot</button><button id="edit" class="secondary">Edit text</button><button id="open" class="text-button">Open project</button><input id="project-file" type="file" accept=".yellowpen" hidden>
<div id="screenshot-controls" hidden></div><div id="template-controls"></div><div class="spec" id="output-spec">3840 × 2160 · 60 FPS · 6 seconds</div></aside>
<section class="editor"><div class="toolbar"><span id="stage">SELECT THE WORDS THAT MATTER</span><button id="select-all">Select all</button><button id="back" hidden>Select other words ↗</button></div><div id="paper"><div id="sheet" tabindex="0" aria-label="Selectable document text"></div></div><textarea id="text" aria-label="Edit document text" maxlength="12000" hidden></textarea><canvas id="preview" hidden aria-label="Animation preview"></canvas><div class="actions"><span id="selection">Try selecting a phrase in the document.</span><button id="animate" class="primary" disabled>Animate selection ↗</button><button id="apply" class="primary" hidden>Use this text ↗</button><button id="play" hidden>Replay ↺</button><button id="cancel" hidden>Cancel export</button></div><div id="status" role="status" aria-live="polite"></div><button id="save" class="text-button" hidden>Save editable project</button></section></div>
</main><dialog id="image-choice"><h2>Use your screenshot</h2><p>Keep the original layout, or turn its words into editable text.</p><img id="import-thumbnail" alt="Screenshot to import"><div class="import-options"><button id="use-original" class="primary">Use as-is<span>Original screenshot + backdrop</span></button><button id="use-ocr">Extract text<span>OCR + text highlights</span></button></div><button id="dismiss-import" class="text-button">Cancel</button></dialog><div id="effect-preview" role="tooltip" hidden><canvas id="effect-canvas" width="640" height="360"></canvas><span id="effect-caption"></span></div>`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let template:TextTemplate=structuredClone(presets.Classic);
const sheet=$('sheet'), input=$<HTMLTextAreaElement>('text'), canvas=$<HTMLCanvasElement>('preview');
let screenshotRegions:Region[]=[];
let screenshotBlob:Blob|undefined,screenshotWidth=0,screenshotHeight=0,backdrop=backdropSchema.parse({});
let incomingImage:Blob|undefined,incomingUrl:string|undefined;
let text=sample,start=0,end=0,renderer:Renderer|undefined,bitmap:ImageBitmap|undefined,result:{project:Project;image:Blob}|undefined;
let previewTimer:ReturnType<typeof setTimeout>|undefined,previewBusy=false,previewQueued=false,previewReplay=false,previewRevision=0;
let raf=0,revision=0,ocr:AbortController|undefined,exportAbort:AbortController|undefined;
const status=(message:string)=>{$('status').textContent=message;};
function show(id:string,visible:boolean){if(id==='export'){const button=$<HTMLButtonElement>(id);button.disabled=!visible||!!exportAbort;button.title=visible?'Download a 3840 × 2160 video at 60 FPS':'Animate your selection to enable export';return;}$(id).hidden=!visible;}
function selectMode(){revision++;clearTimeout(previewTimer);previewQueued=false;applyTextLayout();cancelAnimationFrame(raf);show('select-all',true);show('paper',true);show('preview',false);show('text',false);show('animate',true);for(const id of ['back','play','export','apply','save'])show(id,false);$('stage').textContent='SELECT THE WORDS THAT MATTER';sheet.textContent=text;($('animate') as HTMLButtonElement).disabled=start===end;}
function resetText(value:string){screenshotBlob=undefined;setImageMode(false);text=value;start=end=0;revision++;result=undefined;renderer?.dispose();renderer=undefined;bitmap?.close();bitmap=undefined;selectMode();$('selection').textContent='Select the words you want to stand out.';}
function rememberSelection(){const sel=window.getSelection();if(!sel?.rangeCount)return;const range=sel.getRangeAt(0);if(!sheet.contains(range.startContainer)||!sheet.contains(range.endContainer))return;const before=range.cloneRange();before.selectNodeContents(sheet);before.setEnd(range.startContainer,range.startOffset);start=before.toString().length;end=start+range.toString().length;($('animate') as HTMLButtonElement).disabled=!text.slice(start,end).trim();$('selection').textContent=end>start?`“${text.slice(start,end).slice(0,90)}”`:'Select a phrase.';}
sheet.addEventListener('mouseup',rememberSelection);sheet.addEventListener('touchend',rememberSelection);document.addEventListener('selectionchange',rememberSelection);sheet.addEventListener('keyup',rememberSelection);
$('edit').onclick=()=>{if(screenshotBlob){void readImage(screenshotBlob);return;}ocr?.abort();revision++;cancelAnimationFrame(raf);input.value=text;show('select-all',false);show('paper',false);show('preview',false);show('text',true);for(const id of ['animate','export','play','back','save'])show(id,false);show('apply',true);$('stage').textContent='CHECK THE WORDS · LINE BREAKS ARE KEPT';input.focus();};
$('apply').onclick=()=>{if(!input.value.trim()){status('Add some text first.');return;}resetText(input.value);status('Select a phrase in the document.');};
$('back').onclick=()=>selectMode();$('select-all').onclick=()=>{start=0;end=text.length;($('animate') as HTMLButtonElement).disabled=false;$('selection').textContent='All text selected.';};


function play(){if(!renderer||!result)return;cancelAnimationFrame(raf);const begun=performance.now(),p=result.project;function tick(now:number){const frame=Math.min(Math.floor((now-begun)*p.output.fps/1000),Math.round(p.duration*p.output.fps)-1);renderer!.render(frame);if(frame<Math.round(p.duration*p.output.fps)-1)raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);}
$('play').onclick=play;
function requestPreview(replay=false){
 revision++;cancelAnimationFrame(raf);show('export',false);show('save',false);show('play',false);
 previewQueued=true;previewRevision=revision;previewReplay=replay;clearTimeout(previewTimer);
 status('Updating preview…');previewTimer=setTimeout(()=>void refreshPreview(),replay?0:100);
}
async function refreshPreview(){
 if(previewBusy||!previewQueued)return;
 if(previewRevision!==revision){previewQueued=false;return;}
 previewBusy=true;previewQueued=false;const version=revision,replay=previewReplay;
 try{
  const built=screenshotBlob ? (()=>{
   const project=createProject(screenshotWidth,screenshotHeight);project.output={width:3840,height:2160,fps:60,bitrate:50_000_000};project.camera.enabled=false;project.duration=template.videoDuration;
   Object.assign(project.beats[0],{start:0,reveal:.1,hold:project.duration-.1});project.screenshotDocument=structuredClone(backdrop);
   if(screenshotRegions.length){
    project.screenshotHighlights=true;project.beats[0].regions=structuredClone(screenshotRegions);
    const timing=textTiming(project.duration,template.highlightDuration);Object.assign(project.beats[0],{start:timing.start,reveal:timing.reveal,hold:timing.hold});
    project.beats[0].style=styleSchema.parse({effect:template.effect,color:template.color,opacity:template.opacity,blend:template.effect==='marker'?'multiply':'source-over',texture:'solid',radius:template.radius,dim:{target:'none',amount:0}});
   }
   return {project,image:screenshotBlob};
  })() : await composeText({text,start,end,fontSize:template.fontSize,font:template.font,template:structuredClone(template)});
  if(version!==revision)return;
  const decoded=await createImageBitmap(built.image);
  if(version!==revision){decoded.close();return;}
  renderer?.dispose();bitmap?.close();bitmap=decoded;result=built;
  canvas.width=built.project.output.width;canvas.height=built.project.output.height;
  renderer=new Renderer(built.project,decoded,canvas);
  show('select-all',false);show('paper',false);show('text',false);show('apply',false);show('preview',true);show('animate',false);
  for(const id of ['back','play','export','save'])show(id,true);
  if(screenshotBlob){show('back',false);show('play',screenshotRegions.length>0);$('selection').textContent=screenshotRegions.length?`${screenshotRegions.length} region${screenshotRegions.length===1?'':'s'} · drag to add another`:'Drag a box over the words or area to highlight.';}
  $('stage').textContent='PREVIEW · 4K / 60 FPS';if(!exportAbort)status('');
  if(replay)play();else renderer.render(Math.round(built.project.duration*built.project.output.fps)-1);
  saveLocal(built.project,built.image).catch(()=>{if(version===revision)status('Preview ready. Local autosave is unavailable; use Save editable project.');});
 }catch(e){if(version===revision)status((e as Error).message);}
 finally{previewBusy=false;if(previewQueued){clearTimeout(previewTimer);previewTimer=setTimeout(()=>void refreshPreview(),100);}}
}
$('animate').onclick=()=>requestPreview(true);

function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
$('save').onclick=async()=>{if(!result)return;try{download(await packProject(result.project,result.image),'text-spotlight.yellowpen');}catch(e){status((e as Error).message);}};
$('export').onclick=async()=>{if(!result||exportAbort)return;cancelAnimationFrame(raf);hideEffect();exportAbort=new AbortController();const button=$<HTMLButtonElement>('export');button.disabled=true;show('cancel',true);try{const blob=await exportInWorker(result.project,result.image,{signal:exportAbort.signal,onProgress:p=>status(p.phase==='rendering'?`Exporting ${Math.round(p.completed/p.total*100)}%…`:p.phase==='finalizing'?'Finishing MP4…':'Checking 4K video encoder…')});download(blob,'yellowpen-spotlight.mp4');status('Your MP4 is ready.');}catch(e){status((e as Error).name==='AbortError'?'Export cancelled.':(e as Error).message);}finally{exportAbort=undefined;button.disabled=Boolean(canvas.hidden)||!result||previewBusy||previewQueued;show('cancel',false);}};
$('cancel').onclick=()=>exportAbort?.abort();$('cancel-ocr').onclick=()=>ocr?.abort();
$('open').onclick=()=>$('project-file').click();
$<HTMLInputElement>('project-file').onchange=async e=>{const target=e.target as HTMLInputElement,file=target.files?.[0];target.value='';if(!file)return;ocr?.abort();const version=++revision;try{const saved=await unpackProject(file);if(version!==revision)return;const doc=saved.project.textDocument;if(saved.project.screenshotDocument){await restoreScreenshot(saved.project,saved.image);return;}if(!doc)throw new Error('This file uses screenshot regions. Open it in the original screenshot editor at /lab.html.');template=templateSchema.parse(doc.template??{});syncControls();resetText(doc.text);start=doc.start;end=doc.end;$<HTMLSelectElement>('font').value=doc.font;sheet.style.fontFamily=doc.font==='serif'?'Georgia, serif':'Arial, sans-serif';selectMode();$('selection').textContent='Saved selection restored. Animate to preview it.';status('Project opened.');}catch(e){status((e as Error).message);}};
async function readImage(file:Blob){ocr?.abort();ocr=new AbortController();const version=++revision;show('cancel-ocr',true);status('Reading text in your browser…');try{const found=await recognizeImage(file,ocr.signal,message=>{if(version===revision)status(message);});if(version!==revision)return;show('cancel-ocr',false);resetText(found.text);input.value=text;$('edit').click();status('Text extracted. Check the wording and reading order, then use this text.');}catch(e){if(version===revision)status((e as Error).name==='AbortError'?'Reading cancelled.':(e as Error).message);}finally{if(version===revision||ocr.signal.aborted)show('cancel-ocr',false);}}
$<HTMLInputElement>('file').onchange=e=>{const f=(e.target as HTMLInputElement).files?.[0];if(f)void offerImage(f);(e.target as HTMLInputElement).value='';};
$('drop').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('file').click();}};
window.addEventListener('dragover',e=>{e.preventDefault();$('drop').classList.add('dragging');});window.addEventListener('drop',e=>{e.preventDefault();$('drop').classList.remove('dragging');const f=e.dataTransfer?.files[0];if(f)void offerImage(f);});window.addEventListener('dragleave',()=> $('drop').classList.remove('dragging'));
window.addEventListener('paste',e=>{const file=Array.from(e.clipboardData?.items??[]).find(i=>i.type.startsWith('image/'))?.getAsFile();if(file){e.preventDefault();void offerImage(file);}});
const layoutFields=[['fontSize','Text size',36,100,1],['padding','Side padding',40,300,10],['verticalPadding','Top / bottom margin',40,300,10],['textWidth','Text width %',40,100,1],['lineSpacing','Line spacing',1.2,2,.01]] as const;
const effectFields=[['roughness','Roughness',0,1,.05],['distortion','Distortion',0,.2,.01],['radius','Roundness',0,1,.05],['opacity','Ink opacity',0,1,.05],['dim','Fade surroundings',0,1,.05]] as const;
const timingFields=[['videoDuration','Video length',2,20,.1],['highlightDuration','Draw time',.2,18,.1]] as const;
const rangeFields=[...layoutFields,...effectFields,...timingFields] as const;
const rangeControl=([key,label,min,max,step]:typeof rangeFields[number])=>`<label class="range-setting" for="setting-${key}">${label}<output id="value-${key}"></output></label><input aria-label="${label}" id="setting-${key}" type="range" min="${min}" max="${max}" step="${step}">`;
function applyTextLayout(){
 const width=$('paper').clientWidth;if(!width)return;
 const scale=width/1920;
 $('paper').style.padding=`${template.verticalPadding*scale}px ${template.padding*scale}px`;
 sheet.style.fontSize=`${template.fontSize*scale}px`;sheet.style.lineHeight=String(template.lineSpacing);
 sheet.style.width=template.textWidth+'%';sheet.style.fontFamily=template.font==='serif'?'Georgia, serif':'Arial, sans-serif';
}
new ResizeObserver(applyTextLayout).observe($('paper'));
$('template-controls').innerHTML=`<label class="setting">Style<select id="template-picker"></select></label><div class="effect-options" aria-label="Highlight style"><button type="button" data-effect="underline">Underline</button><button type="button" data-effect="marker">Highlighter</button><button type="button" data-effect="invert">Black block</button><button type="button" data-effect="spotlight">Focus</button></div><label hidden>Effect<select id="effect"><option value="underline">Underline</option><option value="marker">Real highlighter</option><option value="invert">Black block</option><option value="spotlight">Focus only</option></select></label><details id="timing-controls" open><summary>Timing</summary><div class="range-controls">${timingFields.map(rangeControl).join('')}</div><small>The highlight stays visible after drawing.</small></details><details id="text-layout"><summary>Text & layout</summary><label class="setting">Typeface<select id="font"><option value="sans">Clean sans</option><option value="serif">Editorial serif</option></select></label><div class="range-controls">${layoutFields.map(rangeControl).join('')}</div><small>Changes update your preview automatically.</small></details><details id="custom"><summary>More options</summary><label class="setting">Ink color<input id="ink" type="color"></label><div class="range-controls">${effectFields.map(rangeControl).join('')}</div><label>Source credit (optional)<input id="source" maxlength="200" placeholder="Source: publication / article"></label><label>Website / media name (optional)<input id="website" maxlength="100" placeholder="example.com"></label><small>Use a publication name or upload its logo.</small><label class="logo-drop" id="logo-drop">Drop or choose a media logo<input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><button id="clear-logo">Remove logo</button><label>Template name<input id="template-name" maxlength="60" placeholder="My house style"></label><button id="save-template">Save as template</button></details>`;
$('font').onchange=()=>{template.font=$<HTMLSelectElement>('font').value as 'sans'|'serif';changed();};
function templateOptions(){const picker=$<HTMLSelectElement>('template-picker');picker.replaceChildren();for(const name of Object.keys(presets))picker.add(new Option(name,'builtin:'+name));picker.add(new Option('Custom','custom'));for(const item of readTemplates())picker.add(new Option(item.name,'saved:'+item.name));}
function syncControls(){syncTiming();applyTextLayout();const picker=$<HTMLSelectElement>('template-picker');const builtin=presets[template.name];picker.value=builtin&&JSON.stringify(builtin)===JSON.stringify(template)?'builtin:'+template.name:readTemplates().some(t=>t.name===template.name)?'saved:'+template.name:'custom';document.querySelectorAll<HTMLButtonElement>('[data-effect]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.effect===template.effect)));sheet.style.fontFamily=template.font==='serif'?'Georgia, serif':'Arial, sans-serif';for(const [key] of rangeFields){$<HTMLInputElement>('setting-'+key).value=String(template[key]);$('value-'+key).textContent=String(template[key]);}$<HTMLSelectElement>('effect').value=template.effect;$<HTMLInputElement>('ink').value=template.color;$<HTMLInputElement>('source').value=template.source;$<HTMLInputElement>('website').value=template.website;$<HTMLSelectElement>('font').value=template.font;syncTiming();}
function syncTiming(){
 template.highlightDuration=Math.min(template.highlightDuration,Math.round((template.videoDuration-.1)*10)/10);
 for(const [key] of timingFields){$<HTMLInputElement>('setting-'+key).value=String(template[key]);$('value-'+key).textContent=template[key].toFixed(1)+' s';}
 $<HTMLInputElement>('setting-highlightDuration').max=String(Math.min(18,Math.round((template.videoDuration-.1)*10)/10));
 $('output-spec').textContent=`3840 × 2160 · 60 FPS · ${template.videoDuration} seconds`;
}
function changed(markCustom=true){syncTiming();applyTextLayout();if(markCustom){template.name='Custom';$<HTMLSelectElement>('template-picker').value='custom';}if(!canvas.hidden){requestPreview();return;}revision++;if(input.hidden)status('');}
for(const [key] of rangeFields)$('setting-'+key).oninput=()=>{template[key]=Number($<HTMLInputElement>('setting-'+key).value);$('value-'+key).textContent=String(template[key]);changed();};
function effectSettings(effect:TextTemplate['effect']):TextTemplate {if(effect===template.effect)return {...template};return {...template,effect,color:effect==='marker'?'#FFE34D':'#D92127',opacity:effect==='marker'?.65:1,roughness:effect==='marker'?.45:template.roughness};}
$('effect').onchange=()=>{template=effectSettings($<HTMLSelectElement>('effect').value as TextTemplate['effect']);syncControls();changed();};
$('ink').oninput=()=>{template.color=$<HTMLInputElement>('ink').value;changed();};
for(const key of ['source','website'] as const)$(key).oninput=()=>{template[key]=$<HTMLInputElement>(key).value;changed();};
$('template-picker').onchange=()=>{const value=$<HTMLSelectElement>('template-picker').value;if(value==='custom'){$<HTMLDetailsElement>('custom').open=true;return;}const chosen=value.startsWith('builtin:')?presets[value.slice(8)]:readTemplates().find(t=>t.name===value.slice(6));if(chosen){template=structuredClone(chosen);syncControls();changed(false);}};
$('save-template').onclick=()=>{try{const name=$<HTMLInputElement>('template-name').value.trim();if(!name)throw new Error('Give your template a name.');template.font=$<HTMLSelectElement>('font').value as 'sans'|'serif';template={...template,name};saveTemplate(template);templateOptions();$<HTMLSelectElement>('template-picker').value='saved:'+name;status('Template saved in this browser, including layout, effect, source and logo.');}catch(e){status((e as Error).message);}};
let logoRevision=0;
async function setLogo(file:Blob){const version=++logoRevision;try{const data=await logoData(file);if(version!==logoRevision)return;template.logo=data;changed();if(canvas.hidden)status('Logo added.');}catch(e){status((e as Error).message);}}
$<HTMLInputElement>('logo-file').onchange=e=>{const target=e.target as HTMLInputElement;if(target.files?.[0])void setLogo(target.files[0]);target.value='';};
$('logo-drop').ondrop=e=>{e.preventDefault();e.stopPropagation();if(e.dataTransfer?.files[0])void setLogo(e.dataTransfer.files[0]);};
$('clear-logo').onclick=()=>{logoRevision++;delete template.logo;changed();};
const backdropNames={paper:'Paper',sand:'Sand',slate:'Slate',midnight:'Midnight',lavender:'Lavender',image:'Blurred image',custom:'Solid color'};
$('screenshot-controls').innerHTML=`<div class="section-title">Highlight a region</div><small>Drag a box over each line or area. Add multiple boxes in reading order.</small><label class="setting">Effect<select id="image-effect"><option value="underline">Underline</option><option value="marker">Highlighter</option><option value="invert">Invert</option></select></label><label class="setting">Color<input type="color" id="image-ink"></label><label class="setting">Draw time<input id="image-reveal" type="number" min=".2" max="18" step=".1" aria-label="Highlight draw time"></label><div class="region-actions"><button id="undo-region">Undo region</button><button id="clear-regions">Clear</button></div><div class="section-title">Backdrop</div><div class="backdrop-grid">${Object.entries(backdropNames).map(([key,name])=>`<button data-backdrop="${key}" class="backdrop-swatch ${key}" aria-label="${name}"><span>${name}</span></button>`).join('')}</div><label class="setting" id="background-color-row" hidden>Color<input id="background-color" type="color" value="#e8e6e1"></label><div class="range-controls">${[['distance','Backdrop space',0,30,1],['blur','Background blur',0,80,1],['radius','Corner radius',0,60,1],['shadow','Shadow',0,100,1]].map(([key,label,min,max,step])=>`<label for="backdrop-${key}">${label}<output id="backdrop-value-${key}"></output></label><input aria-label="${label}" id="backdrop-${key}" type="range" min="${min}" max="${max}" step="${step}">`).join('')}</div><label class="setting">Video length<input id="screenshot-duration" type="number" min="2" max="20" step=".1" value="6" aria-label="Screenshot video length"></label><small>Seconds · 4K / 60 FPS</small>`;
function syncBackdrop(){
 $<HTMLSelectElement>('image-effect').value=template.effect; $<HTMLInputElement>('image-ink').value=template.color;$<HTMLInputElement>('image-reveal').value=String(template.highlightDuration);

 document.querySelectorAll<HTMLButtonElement>('[data-backdrop]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.backdrop===backdrop.preset)));
 for(const key of ['distance','blur','radius','shadow'] as const){$<HTMLInputElement>('backdrop-'+key).value=String(backdrop[key]);$('backdrop-value-'+key).textContent=String(backdrop[key]);}
 $<HTMLInputElement>('backdrop-blur').disabled=backdrop.preset!=='image';
 $('background-color-row').hidden=backdrop.preset!=='custom';
 $<HTMLInputElement>('background-color').value=backdrop.color;
 $<HTMLInputElement>('screenshot-duration').value=String(template.videoDuration);
}
function setImageMode(active:boolean){$('screenshot-controls').hidden=!active;$('template-controls').hidden=active;$('edit').textContent=active?'Extract text with OCR':'Edit text';if(active)syncBackdrop();else syncControls();}
async function useScreenshot(file:Blob,preserveRegions=false){
 ocr?.abort();const version=++revision;
 try{const decoded=await decodeImage(file);if(version!==revision){decoded.close();return;}
 if(!preserveRegions)screenshotRegions=[];screenshotWidth=decoded.width;screenshotHeight=decoded.height;decoded.close();screenshotBlob=file;setImageMode(true);requestPreview();
 }catch(e){status((e as Error).message);}
}
async function restoreScreenshot(project:Project,image:Blob){backdrop=backdropSchema.parse(project.screenshotDocument);template.videoDuration=project.duration;screenshotRegions=project.screenshotHighlights?structuredClone(project.beats[0].regions):[];if(project.screenshotHighlights){template.effect=project.beats[0].style.effect;template.color=project.beats[0].style.color;template.opacity=project.beats[0].style.opacity;template.highlightDuration=project.beats[0].reveal;}await useScreenshot(image,true);}
function closeImport(){ $<HTMLDialogElement>('image-choice').close();if(incomingUrl)URL.revokeObjectURL(incomingUrl);incomingUrl=undefined;incomingImage=undefined; }
async function offerImage(file:Blob){
 try{const image=await decodeImage(file);image.close();if(incomingUrl)URL.revokeObjectURL(incomingUrl);incomingImage=file;incomingUrl=URL.createObjectURL(file);$<HTMLImageElement>('import-thumbnail').src=incomingUrl;$<HTMLDialogElement>('image-choice').showModal();}
 catch(e){status((e as Error).message);}
}

let dragStart:{x:number;y:number}|undefined;
function imagePoint(e:PointerEvent){
 const box=canvas.getBoundingClientRect(),scale=Math.min(box.width/3840,box.height/2160),ox=box.left+(box.width-3840*scale)/2,oy=box.top+(box.height-2160*scale)/2;
 const r=screenshotRect(screenshotWidth,screenshotHeight,3840,2160,backdrop.distance);
 return {x:((e.clientX-ox)/scale-r.x)*screenshotWidth/r.width,y:((e.clientY-oy)/scale-r.y)*screenshotHeight/r.height};
}
function dragRegion(e:PointerEvent){const p=imagePoint(e),a=dragStart!;const x=Math.max(0,Math.min(screenshotWidth,p.x)),y=Math.max(0,Math.min(screenshotHeight,p.y));return {x:Math.min(a.x,x),y:Math.min(a.y,y),width:Math.abs(x-a.x),height:Math.abs(y-a.y)};}
canvas.addEventListener('pointerdown',e=>{
 if(!screenshotBlob||previewBusy||previewQueued||exportAbort)return;const p=imagePoint(e);
 if(p.x<0||p.y<0||p.x>screenshotWidth||p.y>screenshotHeight)return;
 e.preventDefault();cancelAnimationFrame(raf);dragStart=p;canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{if(!dragStart||!renderer||!result)return;
 renderer.render(Math.round(result.project.duration*60)-1);const region=dragRegion(e),r=screenshotRect(screenshotWidth,screenshotHeight,canvas.width,canvas.height,backdrop.distance),scale=r.width/screenshotWidth,c=canvas.getContext('2d')!;
 c.save();c.strokeStyle='#2563eb';c.lineWidth=6;c.setLineDash([18,12]);c.strokeRect(r.x+region.x*scale,r.y+region.y*scale,region.width*scale,region.height*scale);c.restore();
});
canvas.addEventListener('pointerup',e=>{if(!dragStart)return;const region=dragRegion(e);dragStart=undefined;canvas.releasePointerCapture(e.pointerId);
 if(region.width>=2&&region.height>=2&&screenshotRegions.length<32){screenshotRegions.push(region);requestPreview(true);}else{renderer?.render(Math.round((result?.project.duration??6)*60)-1);status(screenshotRegions.length>=32?'Use up to 32 regions.':'Drag a larger box to select a region.');}
});
canvas.addEventListener('pointercancel',()=>{dragStart=undefined;if(result)renderer?.render(Math.round(result.project.duration*60)-1);});
$('undo-region').onclick=()=>{screenshotRegions.pop();requestPreview();};
$('clear-regions').onclick=()=>{screenshotRegions=[];requestPreview();};
$('image-effect').onchange=()=>{template=effectSettings($<HTMLSelectElement>('image-effect').value as TextTemplate['effect']);syncBackdrop();requestPreview(true);};
$('image-ink').oninput=()=>{template.color=$<HTMLInputElement>('image-ink').value;requestPreview();};
$('image-reveal').onchange=()=>{const n=$<HTMLInputElement>('image-reveal').valueAsNumber;if(Number.isFinite(n)&&n>=.2&&n<=18){template.highlightDuration=n;requestPreview(true);}else syncBackdrop();};

$('dismiss-import').onclick=closeImport;
$('image-choice').addEventListener('cancel',()=>closeImport());
$('use-original').onclick=()=>{const file=incomingImage;closeImport();if(file)void useScreenshot(file);};
$('use-ocr').onclick=()=>{const file=incomingImage;closeImport();if(file)void readImage(file);};
$('paste-image').onclick=async()=>{
 const button=$<HTMLButtonElement>('paste-image');button.disabled=true;
 try{
  if(!navigator.clipboard?.read)throw new Error('Use ⌘V / Ctrl+V to paste a screenshot, or drop an image here.');
  const items=await navigator.clipboard.read();
  for(const item of items){const type=item.types.find(t=>t==='image/png'||t==='image/jpeg');if(type){await offerImage(await item.getType(type));return;}}
  status('No screenshot found. Copy an image first, then paste it here.');
 }catch(e){status((e as Error).name==='NotAllowedError'?'Clipboard access was not allowed. Use ⌘V / Ctrl+V or drop your screenshot.':(e as Error).message);}
 finally{button.disabled=false;}
};
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-backdrop]'))button.onclick=()=>{backdrop.preset=button.dataset.backdrop as typeof backdrop.preset;syncBackdrop();requestPreview();};
for(const key of ['distance','blur','radius','shadow'] as const)$('backdrop-'+key).oninput=()=>{backdrop[key]=Number($<HTMLInputElement>('backdrop-'+key).value);syncBackdrop();requestPreview();};
$('background-color').oninput=()=>{backdrop.color=$<HTMLInputElement>('background-color').value;requestPreview();};
$('screenshot-duration').onchange=()=>{const value=$<HTMLInputElement>('screenshot-duration').valueAsNumber;if(!Number.isFinite(value)||value<2||value>20){syncBackdrop();status('Choose a video length from 2 to 20 seconds.');return;}template.videoDuration=Math.round(value*10)/10;requestPreview();};

templateOptions();syncControls();$<HTMLSelectElement>('template-picker').value='builtin:Classic';
selectMode();$('native').textContent='OCR runs in your browser · English';
const initialRevision=revision;loadLocal().then(saved=>{if(revision!==initialRevision||!saved)return;if(saved.project.screenshotDocument){void restoreScreenshot(saved.project,saved.image);return;}if(!saved.project.textDocument)return;const doc=saved.project.textDocument;template=templateSchema.parse(doc.template??{});syncControls();text=doc.text;start=doc.start;end=doc.end;$<HTMLSelectElement>('font').value=doc.font;sheet.style.fontFamily=doc.font==='serif'?'Georgia, serif':'Arial, sans-serif';selectMode();$('selection').textContent='Previous text restored. Select words or animate again.';}).catch(()=>{});


let tooltipRevision=0,tooltipRaf=0,tooltipRenderer:Renderer|undefined,tooltipImage:ImageBitmap|undefined;
const tooltip=$('effect-preview'),tipCanvas=$<HTMLCanvasElement>('effect-canvas');
function hideEffect(){tooltipRevision++;cancelAnimationFrame(tooltipRaf);tooltip.hidden=true;tooltipRenderer?.dispose();tooltipRenderer=undefined;tooltipImage?.close();tooltipImage=undefined;}
function placeEffect(x:number,y:number){const w=Math.min(280,innerWidth-24),h=w*9/16+30;tooltip.style.left=Math.max(12,Math.min(innerWidth-w-12,x-w/2))+'px';tooltip.style.top=Math.max(12,y-h-16)+'px';}
async function showEffect(button:HTMLButtonElement,x:number,y:number){hideEffect();const version=tooltipRevision;placeEffect(x,y);try{const effect=button.dataset.effect as TextTemplate['effect'];const previewTemplate=effectSettings(effect);const a=end>start?start:0,b=end>start?end:Math.min(text.indexOf('\n')>0?text.indexOf('\n'):text.length,80);const built=await composeText({text,start:a,end:b,font:template.font,fontSize:template.fontSize,template:previewTemplate},true);const decoded=await createImageBitmap(built.image);if(version!==tooltipRevision){decoded.close();return;}tooltipImage=decoded;tooltipRenderer=new Renderer(built.project,decoded,tipCanvas);$('effect-caption').textContent=button.textContent+' preview';tooltip.hidden=false;const begun=performance.now();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function tick(now:number){if(version!==tooltipRevision)return;const fps=built.project.output.fps,begin=built.project.beats[0].start*fps,last=Math.min(Math.round(built.project.duration*fps)-1,Math.ceil((built.project.beats[0].start+built.project.beats[0].reveal)*fps));const frame=reduced?last:Math.min(last,Math.floor(begin+(now-begun)*fps/1000));tooltipRenderer!.render(frame);if(!reduced&&frame<last)tooltipRaf=requestAnimationFrame(tick);}tick(begun);}catch{if(version===tooltipRevision)hideEffect();}}
let hoverButton:HTMLButtonElement|undefined,keyboardInput=false;
let pointer={x:0,y:0};
document.addEventListener('pointerdown',()=>{keyboardInput=false;},true);
document.addEventListener('keydown',e=>{if(e.key==='Tab')keyboardInput=true;},true);
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-effect]')){
 button.onclick=()=>{const select=$<HTMLSelectElement>('effect');select.value=button.dataset.effect!;select.dispatchEvent(new Event('change'));hideEffect();if(hoverButton===button)void showEffect(button,pointer.x,pointer.y);};
 button.onpointerenter=e=>{if(e.pointerType==='touch')return;hoverButton=button;pointer={x:e.clientX,y:e.clientY};void showEffect(button,pointer.x,pointer.y);};
 button.onpointermove=e=>{if(e.pointerType==='touch'||hoverButton!==button)return;pointer={x:e.clientX,y:e.clientY};placeEffect(pointer.x,pointer.y);};
 button.onpointerleave=()=>{if(hoverButton===button){hoverButton=undefined;hideEffect();}};
 // Mouse clicks must not create a second, button-anchored tooltip via focus.
 button.onfocus=()=>{if(!keyboardInput)return;const r=button.getBoundingClientRect();void showEffect(button,r.x+r.width/2,r.y);};
 button.onblur=()=>{if(!hoverButton)hideEffect();};
}
function dismissEffect(){hoverButton=undefined;hideEffect();}
window.addEventListener('scroll',dismissEffect,{passive:true,capture:true});
window.addEventListener('resize',dismissEffect);
window.addEventListener('blur',dismissEffect);
window.addEventListener('keydown',e=>{if(e.key==='Escape')dismissEffect();});
