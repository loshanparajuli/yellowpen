import './style.css';
import { createProject, parseProject, frameCount, withFps, referenceStyle, styleSchema } from '../core/project';
import type { Project } from '../core/project';
import { ProjectHistory } from '../core/history';
import { cameraAt, invertTransform, clamp } from '../core/timeline';
import { Renderer } from '../render/renderer';
import { decodeImage } from '../storage/image';
import { packProject, unpackProject, saveLocal, loadLocal } from '../storage/project-store';
import { exportInWorker } from '../export/client';
import { fixture } from './fixture';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `<div class="page-shell">
<header class="site-header"><a class="brand" href="/" aria-label="YellowPen home"><svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M5 20 16 3l9 6-11 17-9-6Z" fill="currentColor"/><path d="m4 22 7 5-8 1 1-6Z" fill="currentColor"/></svg>yellowpen<span class="beta">BETA</span></a><div class="header-right"><span class="private"><i></i> Your files stay yours</span><details class="project-menu"><summary>Project <span>⌄</span></summary><div class="menu-panel"><button id="save">Save project</button><label class="file">Open project<input id="open" type="file" accept=".yellowpen,.zip"></label><button id="sample">Try the example</button></div></details></div></header>
<main>
<div class="intro"><div><p class="eyebrow"><span></span> A LITTLE LESS EDITING.</p><h1>Make your <em>point.</em></h1></div><p class="intro-copy">A screenshot. A sentence. A little emphasis.<br>Turn your sources into a story in seconds.</p></div>
<div class="workspace">
<section class="editor" aria-label="Video preview">
<div class="editor-toolbar"><span class="file-label"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 2h7l4 4v12H5V2Z M12 2v5h4 M8 11h5 M8 14h5" stroke="currentColor" stroke-width="1.2"/></svg><span id="sourceName">Your document</span></span><div class="canvas-actions"><button id="undo" class="icon-button" aria-label="Undo" title="Undo">↶</button><button id="redo" class="icon-button" aria-label="Redo" title="Redo">↷</button><span class="separator"></span><button id="selectRegion" class="quiet-button">↗ Select text</button></div></div>
<div class="canvas-stage" id="dropzone"><canvas id="preview" width="960" height="540" tabindex="0" aria-label="Document preview. Drag over text to highlight it. Shift-drag to add a line."></canvas><div class="drop-message">Drop your screenshot here</div></div>
<div class="playback"><button id="play" aria-label="Play preview">▶</button><input id="scrub" aria-label="Frame" type="range" min="0" max="359" value="0"><output id="time"></output><span class="preview-label">PREVIEW</span></div>
<div class="canvas-hint"><span><span class="hint-icon">⌖</span> Drag across the words you want to highlight.</span><span><kbd>shift</kbd> to add a line</span></div>
</section>
<aside class="settings" aria-label="Shot controls">
<section class="setting-section"><div class="section-title"><span class="step">01</span><h2>Add your source</h2></div><label class="upload-button file"><span class="upload-icon">＋</span><span>Choose a screenshot<small>PNG or JPG · or paste with ⌘V</small></span><input id="image" type="file" accept="image/png,image/jpeg"></label></section>
<section class="setting-section look-section"><div class="section-title"><span class="step">02</span><h2>Give it a look</h2></div><div class="look-options" role="group" aria-label="Highlight look"><button id="reference" class="look-card" aria-pressed="true"><span class="look-sample"><b class="ink-sample">Make a point.</b></span><span>Focus<span class="selected-dot"></span></span></button><button id="markerPreset" class="look-card" aria-pressed="false"><span class="look-sample"><b class="marker-sample">Make a point.</b></span><span>Marker<span class="selected-dot"></span></span></button><button id="underlinePreset" class="look-card" aria-pressed="false"><span class="look-sample"><b class="underline-sample">Make a point.</b></span><span>Underline<span class="selected-dot"></span></span></button></div>
<label class="camera-control" for="camera"><span>Gently zoom in<small>Bring the sentence into focus</small></span><input id="camera" type="checkbox" role="switch"><span class="switch" aria-hidden="true"></span></label>
<details class="fine-tune" id="fineTune"><summary>Fine-tune the look <span>＋</span></summary><fieldset id="controls">
<label class="control">Effect<select id="effect"><option value="marker">Marker</option><option value="underline">Underline</option><option value="spotlight">Spotlight</option><option value="invert">Focus</option></select></label>
<label class="control">Color<input id="color" type="color"></label><label class="control">Opacity<input id="opacity" type="range" min="0" max="1" step="0.01"></label>
<label class="control">Blend<select id="blend">${['multiply','source-over','screen','overlay','difference','exclusion'].map(v => `<option value="${v}">${v === 'source-over' ? 'Normal' : v}</option>`).join('')}</select></label>
<label class="control">Fade<select id="dim"><option value="none">None</option><option value="outside">Surrounding text</option><option value="inside">Selected text</option></select></label>
<label class="control">Fade toward<select id="dimColor"><option value="#FFFFFF">White</option><option value="#000000">Black</option></select></label>
<label class="control">Fade amount<input id="dimAmount" type="range" min="0" max="1" step="0.01"></label>
<label class="control">Texture<select id="texture"><option value="solid">Solid</option><option value="felt-tip">Felt tip</option><option value="dry-marker">Dry marker</option></select></label>
<label class="control">Roughness<input id="roughness" type="range" min="0" max="0.2" step="0.01"></label></fieldset></details></section>
<section class="export-section"><div class="section-title"><span class="step">03</span><h2>Take it to your edit</h2></div><div class="export-options"><label><span>FORMAT</span><select id="ratio" aria-label="Aspect ratio"><option value="1920x1080">16:9 · Landscape</option><option value="1080x1920">9:16 · Portrait</option><option value="1080x1080">1:1 · Square</option></select></label><label><span>QUALITY</span><select id="fps" aria-label="Frame rate">${[24,25,30,60,120].map(v => `<option value="${v}">${v} FPS</option>`).join('')}</select></label></div><button id="export" class="primary">Export video <span>↗</span></button><button id="cancel" disabled hidden>Cancel export</button><p class="export-note">MP4 · Ready for your favorite editor</p><progress id="progress" value="0" max="1" hidden></progress><a id="download" hidden></a></section>
</aside></div>
<div class="under-workspace"><div id="status" role="status" aria-live="polite">Getting your canvas ready…</div><span class="local-note"><i></i> Made on your device. Never uploaded.</span></div>
<details class="developer-tools"><summary>Advanced project settings</summary><p class="hint">Edit timing, multiple highlights, and stroke geometry. Changes are validated before they’re applied.</p><textarea id="json" aria-label="Project JSON" spellcheck="false"></textarea><button id="apply">Apply changes</button></details>
</main><footer class="site-footer"><span>From a source. To a story.</span><span>yellowpen <span class="footer-slash">/</span> by fromSilicon</span></footer></div>`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);
const select = (id: string) => $<HTMLSelectElement>(id);
const canvas = $<HTMLCanvasElement>('preview');
let project: Project, source: ImageBitmap, image: Blob, renderer: Renderer, history: ProjectHistory;
let frame = 0, playing = false, playStart = 0, controller: AbortController | undefined, downloadUrl: string | undefined;
let saving = Promise.resolve(), loadGeneration = 0;
function status(message: string, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function report(error: unknown) { status(error instanceof Error ? error.message : String(error), true); }
function persist() {
  const snapshot = structuredClone(project), asset = image;
  saving = saving.catch(() => {}).then(() => saveLocal(snapshot, asset)).catch(() => { status('Autosave unavailable. Download a project file to keep your work.', true); });
}
function sync() {
  renderer?.dispose();
  canvas.width = Math.round(project.output.width / 2); canvas.height = Math.round(project.output.height / 2);
  renderer = new Renderer(project, source, canvas);
  const style = project.beats[0].style;
  input('color').disabled = style.effect === 'invert' || style.effect === 'spotlight';
  select('blend').disabled = style.effect === 'invert' || style.effect === 'spotlight';
  select('effect').value = style.effect; input('color').value = style.color; input('opacity').value = String(style.opacity);
  select('blend').value = style.blend; select('dim').value = style.dim.target; input('dimAmount').value = String(style.dim.amount);
  select('dimColor').value = style.dim.color ?? '#000000';
  select('texture').value = style.texture; input('roughness').value = String(style.displacement); input('camera').checked = project.camera.enabled;
  select('fps').value = String(project.output.fps); select('ratio').value = `${project.output.width}x${project.output.height}`;
  input('scrub').max = String(frameCount(project) - 1); frame = Math.min(frame, frameCount(project) - 1);
  $<HTMLTextAreaElement>('json').value = JSON.stringify(project, null, 2);
  $<HTMLButtonElement>('undo').disabled = !history.canUndo; $<HTMLButtonElement>('redo').disabled = !history.canRedo;
  for (const [id, effect] of [['reference','invert'],['markerPreset','marker'],['underlinePreset','underline']]) $(id).setAttribute('aria-pressed', String(style.effect === effect));
  draw();
}
function draw() {
  if (!renderer) return;
  renderer.render(frame); input('scrub').value = String(frame);
  $('time').textContent = `${(frame / project.output.fps).toFixed(2)} / ${project.duration.toFixed(2)}s`;
}
function stop() { playing = false; $('play').textContent = '▶'; $('play').setAttribute('aria-label','Play preview'); }
function commit(next: Project) { stop(); project = history.commit(next); sync(); persist(); }
async function install(blob: Blob, saved?: Project) {
  const generation = ++loadGeneration, decoded = await decodeImage(blob);
  if (generation !== loadGeneration) { decoded.close(); return; }
  if (saved && (saved.source.width !== decoded.width || saved.source.height !== decoded.height)) { decoded.close(); throw new Error('Project image dimensions do not match.'); }
  const next = saved ?? createProject(decoded.width, decoded.height);
  stop(); source?.close(); image = blob; source = decoded; project = next; frame = 0; history = new ProjectHistory(project); sync(); persist();
  $('sourceName').textContent = blob instanceof File ? blob.name : 'Your document';
  status('Drag to highlight. We’ll take care of the animation.');
}
async function sample() { const f = await fixture(); const p = createProject(1600,1100); p.beats[0].regions = f.regions; await install(f.blob, p); $('sourceName').textContent='A little evidence.png'; frame=180; draw(); }
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
function applyLook(kind: 'focus' | 'marker' | 'underline') {
  const p=structuredClone(project);
  for (const beat of p.beats) beat.style=kind==='focus' ? referenceStyle() : styleSchema.parse({effect:kind, opacity:kind==='marker'?0.65:1, color:kind==='marker'?'#F5E94B':'#222222', radius:0, dim:{target:'outside', amount:0.35, color:'#FFFFFF'}});
  commit(p); frame=Math.min(frameCount(p)-1,Math.ceil((p.beats[0].start+p.beats[0].reveal+0.2)*p.output.fps)); draw();
  status('Looking good. Preview the motion, or make it yours.');
}
$('reference').onclick = () => applyLook('focus');
$('markerPreset').onclick = () => applyLook('marker');
$('underlinePreset').onclick = () => applyLook('underline');
$('selectRegion').onclick = () => { stop(); frame=0; draw(); canvas.focus(); status('Drag over a sentence. Hold Shift to add another line.'); };
$('dropzone').ondragover = e => { e.preventDefault(); $('dropzone').classList.add('dragging'); };
$('dropzone').ondragleave = () => $('dropzone').classList.remove('dragging');
$('dropzone').ondrop = e => { e.preventDefault(); $('dropzone').classList.remove('dragging'); const file=e.dataTransfer?.files[0]; if(file) install(file).catch(report); };
$('sample').onclick = () => { sample().catch(report); };
input('image').onchange = () => { const file = input('image').files?.[0]; if (file) install(file).catch(report); input('image').value = ''; };
window.addEventListener('paste', e => { const file = [...(e.clipboardData?.files ?? [])].find(f => /^image\/(png|jpeg)$/.test(f.type)); if (file) { e.preventDefault(); install(file).catch(report); } });
$('undo').onclick = () => { stop(); project = history.undo(); sync(); persist(); };
$('redo').onclick = () => { stop(); project = history.redo(); sync(); persist(); };
$('save').onclick = () => { packProject(project, image).then(blob => download(blob, 'shot.yellowpen')).catch(report); };
input('open').onchange = () => { const file = input('open').files?.[0]; if (file) unpackProject(file).then(({project, image}) => install(image, project)).catch(report); input('open').value = ''; };
$('apply').onclick = () => { try { const next = parseProject(JSON.parse($<HTMLTextAreaElement>('json').value)); if (next.source.width !== source.width || next.source.height !== source.height) throw new Error('Source dimensions cannot be changed independently of the image.'); commit(next); status('Project validated and applied.'); } catch (e) { report(e); } };
for (const id of ['effect','color','opacity','blend','dim','dimAmount','dimColor','texture','roughness','camera','ratio','fps']) {
  $(id).onchange = () => {
    try {
      let p = structuredClone(project), s = p.beats[0].style;
      if (id === 'effect') { s.effect = select(id).value as typeof s.effect; if (s.effect === 'invert') s.opacity = 1; if (s.effect === 'spotlight') s.dim.target = 'outside'; }
      if (id === 'color') s.color = input(id).value;
      if (id === 'opacity') s.opacity = Number(input(id).value);
      if (id === 'blend') s.blend = select(id).value as typeof s.blend;
      if (id === 'dim') s.dim.target = select(id).value as typeof s.dim.target;
      if (id === 'dimColor') s.dim.color = select(id).value;
      if (id === 'dimAmount') s.dim.amount = Number(input(id).value);
      if (id === 'texture') s.texture = select(id).value as typeof s.texture;
      if (id === 'roughness') s.displacement = Number(input(id).value);
      if (id === 'camera') p.camera.enabled = input(id).checked;
      if (id === 'ratio') { const [width,height] = select(id).value.split('x').map(Number); p.output.width=width; p.output.height=height; }
      if (id === 'fps') { const t = frame / p.output.fps; p = withFps(p, Number(select(id).value) as Project['output']['fps']); frame = Math.round(t * p.output.fps); }
      commit(p);
    } catch(e) { report(e); }
  };
}
$('play').onclick = () => {
  if (playing) { stop(); return; }
  if (frame >= frameCount(project)-1) frame = 0;
  playing = true; playStart = performance.now() - frame / project.output.fps * 1000; $('play').textContent = 'Ⅱ'; $('play').setAttribute('aria-label','Pause preview');
  const tick = () => { if (!playing) return; frame = Math.min(frameCount(project)-1, Math.floor((performance.now() - playStart) / 1000 * project.output.fps)); draw(); if (frame >= frameCount(project)-1) stop(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick);
};
input('scrub').oninput = () => { stop(); frame = Number(input('scrub').value); draw(); };
let start: { x: number; y: number } | undefined;
function sourcePoint(e: PointerEvent) {
  const box = canvas.getBoundingClientRect();
  const q = invertTransform({ x: (e.clientX-box.left)/box.width*project.output.width, y: (e.clientY-box.top)/box.height*project.output.height }, cameraAt(project,frame/project.output.fps));
  return { x: clamp(q.x,0,project.source.width), y: clamp(q.y,0,project.source.height) };
}
canvas.onpointerdown = e => { stop(); draw(); start=sourcePoint(e); canvas.setPointerCapture(e.pointerId); };
canvas.onpointermove = e => { if (!start) return; draw(); const box=canvas.getBoundingClientRect(), camera=cameraAt(project,frame/project.output.fps), x=(start.x*camera.scale+camera.x)/project.output.width*canvas.width, y=(start.y*camera.scale+camera.y)/project.output.height*canvas.height; const c=canvas.getContext('2d')!; c.strokeStyle='#71812c'; c.lineWidth=2; c.setLineDash([5,4]); c.strokeRect(x,y,(e.clientX-box.left)/box.width*canvas.width-x,(e.clientY-box.top)/box.height*canvas.height-y); c.setLineDash([]); };
canvas.onpointerup = e => { if (!start) return; const end=sourcePoint(e), r={ x:Math.min(start.x,end.x), y:Math.min(start.y,end.y), width:Math.abs(end.x-start.x), height:Math.abs(end.y-start.y) }; start=undefined; if(r.width<3 || r.height<3){draw();return;} const p=structuredClone(project); p.beats[0].regions=e.shiftKey?[...p.beats[0].regions,r]:[r]; try{commit(p);frame=Math.min(frameCount(p)-1,Math.ceil((p.beats[0].start+p.beats[0].reveal+0.2)*p.output.fps));draw();}catch(error){report(error);} };
canvas.onpointercancel = () => { start=undefined; draw(); };
$('export').onclick = async () => {
  if(controller) return;
  stop(); controller=new AbortController(); const snapshot=structuredClone(project);
  $<HTMLButtonElement>('export').disabled=true; $<HTMLButtonElement>('cancel').disabled=false; $('progress').hidden=false;
  $('cancel').hidden=false; $('export').textContent='Preparing your video…';
  status('Checking export support on your device…');
  try {
    const started=performance.now();
    const blob=await exportInWorker(snapshot,image,{signal:controller.signal,onProgress:p=>{ $<HTMLProgressElement>('progress').value=p.completed/p.total; status(p.phase==='probing'?'Preparing your video…':p.phase==='finalizing'?'Finishing up…':`Creating your video · ${Math.round(p.completed/p.total*100)}%`); }});
    if(downloadUrl) URL.revokeObjectURL(downloadUrl); downloadUrl=URL.createObjectURL(blob);
    const link=$<HTMLAnchorElement>('download');link.href=downloadUrl;link.download=`yellowpen-${snapshot.output.width}x${snapshot.output.height}-${snapshot.output.fps}fps.mp4`;link.textContent='Download finished MP4';link.hidden=false;link.click();
    status(`Exported ${frameCount(snapshot)} frames at ${snapshot.output.fps} FPS in ${((performance.now()-started)/1000).toFixed(1)}s · ${(blob.size/1024/1024).toFixed(1)} MB.`);
  }catch(e){if(e instanceof Error && e.name==='AbortError') status('Export cancelled. Your project is unchanged.');else report(e);}
  finally{controller=undefined;$<HTMLButtonElement>('export').disabled=false;$<HTMLButtonElement>('cancel').disabled=true;$('progress').hidden=true; $('cancel').hidden=true; $('export').innerHTML='Export video <span>↗</span>';}
};
$('cancel').onclick = () => controller?.abort();
window.addEventListener('keydown',e=>{ if((e.target as HTMLElement).closest('input,textarea,select,button,summary,a'))return; if(e.code==='Space'){e.preventDefault();$('play').click();} if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();stop();frame=clamp(frame+(e.key==='ArrowRight'?1:-1),0,frameCount(project)-1);draw();} });
try { const saved=await loadLocal(); if(saved) await install(saved.image,saved.project); else await sample(); } catch(e) { await sample(); report(e); }
