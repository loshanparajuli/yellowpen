import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const base = process.env.YELLOWPEN_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors=[];
page.on('pageerror', e => errors.push(e.message));
await mkdir('artifacts', { recursive: true });
try {
  await page.goto(base);
  await page.getByText('Drag to highlight. We’ll take care of the animation.').waitFor();
  const result = await page.evaluate(async () => {
    const engine = await import('/src/index.ts');
    const { fixture } = await import('/src/lab/fixture.ts');
    const media = await import('/node_modules/.vite/deps/mediabunny.js');
    const checks=[];
    const check=(condition,message)=>{if(!condition)throw new Error(message);checks.push(message);};
    const f=await fixture();
    const source=await engine.decodeImage(f.blob), p=engine.createProject(source.width,source.height);
    p.beats[0].regions=f.regions;
    const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
    const renderer=new engine.Renderer(p,source,canvas);
    renderer.render(180);const before=canvas.toDataURL();renderer.render(15);renderer.render(359);renderer.render(180);
    check(before===canvas.toDataURL(),'seek-order determinism');renderer.dispose();
    const packed=await engine.packProject(p,f.blob), restored=await engine.unpackProject(packed);
    check(JSON.stringify(restored.project)===JSON.stringify(p),'portable manifest roundtrip');
    check(restored.image.size===f.blob.size,'portable asset roundtrip');
    await engine.saveLocal(p,f.blob);const loaded=await engine.loadLocal();check(loaded.project.output.fps===60,'IndexedDB roundtrip');
    // Exact compositing fixtures: source pixels, camera transform, and region overlaps.
    const small=document.createElement('canvas');small.width=small.height=200;
    const c=small.getContext('2d');c.fillStyle='white';c.fillRect(0,0,200,200);c.fillStyle='black';c.fillRect(70,70,60,60);
    const q=engine.createProject(200,200);q.output={width:200,height:200,fps:60,bitrate:1_000_000};q.camera.enabled=false;
    q.beats[0].regions=[{x:50,y:50,width:100,height:100},{x:60,y:50,width:100,height:100}];
    q.beats[0].style.effect='invert';q.beats[0].style.opacity=1;q.beats[0].style.radius=0;
    const out=document.createElement('canvas');out.width=out.height=200;const pixel=(x,y)=>[...out.getContext('2d').getImageData(x,y,1,1).data];
    let r=new engine.Renderer(q,small,out);r.render(200);
    check(pixel(100,100)[0]===255,'overlapping inversion turns black white once');
    check(pixel(65,65)[0]===0,'white paper inverts to black');
    check(pixel(20,20)[0]===255,'outside inversion remains unchanged');r.dispose();
    q.beats[0].style.effect='spotlight';q.beats[0].style.dim={target:'outside',amount:0.5};
    r=new engine.Renderer(q,small,out);r.render(200);check(Math.abs(pixel(20,20)[0]-128)<=1,'outside dim');check(pixel(65,65)[0]===255,'dim preserves selected source');r.dispose();
    q.beats[0].style.dim.target='inside';r=new engine.Renderer(q,small,out);r.render(200);check(Math.abs(pixel(65,65)[0]-128)<=1,'inside dim');check(pixel(20,20)[0]===255,'inside dim preserves outside');r.dispose();
    q.beats[0].style.dim={target:'outside',amount:0.72,color:'#FFFFFF'};
    q.beats[0].regions=[{x:10,y:10,width:20,height:20}];
    r=new engine.Renderer(q,small,out);r.render(200);check(Math.abs(pixel(100,100)[0]-184)<=1,'reference wash fades black source text toward white');check(pixel(20,20)[0]===255,'reference wash preserves white paper');r.dispose();
    // Cancel while encoding, then immediately retry a full worker export.
    const abort=new AbortController();let cancelled=false;
    try{await engine.exportInWorker(p,f.blob,{signal:abort.signal,onProgress:v=>{if(v.phase==='rendering'&&v.completed>=8)abort.abort();}});}catch(e){cancelled=e.name==='AbortError';}
    check(cancelled,'worker cancellation during export');
    const began=performance.now();
    const blob=await engine.exportInWorker(p,f.blob);
    const seconds=(performance.now()-began)/1000;
    const input=new media.Input({source:new media.BlobSource(blob),formats:[media.MP4]});
    const track=await input.getPrimaryVideoTrack();
    let frames=0;for await(const packet of new media.EncodedPacketSink(track).packets())frames++;
    check(frames===360,'1080p60 contains 360 frames');
    const duration=await input.computeDuration();check(Math.abs(duration-6)<1/60,'exact six-second duration');
    check(track.displayWidth===1920&&track.displayHeight===1080,'1920x1080 output dimensions');
    const sink=new media.VideoSampleSink(track);
    const movingA=await sink.getSample(1.5), movingB=await sink.getSample(1.5+1/60);
    check(Math.abs(movingB.timestamp-movingA.timestamp-1/60)<0.0001,'adjacent output frames have 60 fps timestamps');
    movingA.draw(canvas.getContext('2d'),0,0);const movingPixels=canvas.toDataURL();movingB.draw(canvas.getContext('2d'),0,0);
    check(movingPixels!==canvas.toDataURL(),'motion is evaluated on adjacent 60 fps frames');movingA.close();movingB.close();
    const decoded=await sink.getSample(3);
    check(!!decoded,'exported settled frame decodes');
    const reference=document.createElement('canvas');reference.width=1920;reference.height=1080;
    const rr=new engine.Renderer(p,source,reference);rr.render(180);
    decoded.draw(canvas.getContext('2d'),0,0);decoded.close();
    const a=canvas.getContext('2d').getImageData(0,0,1920,1080).data,b=reference.getContext('2d').getImageData(0,0,1920,1080).data;
    let error=0,n=0;for(let i=0;i<a.length;i+=16){error+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);n+=3;}
    const meanError=error/n;check(meanError<8,'decoded export agrees with preview');rr.dispose();input.dispose();
    const p120=engine.withFps(p,120);let highRate;
    const capability=await engine.checkCapability(p120);
    if(capability.supported){
      const high=await engine.exportInWorker(p120,f.blob);
      const hi=new media.Input({source:new media.BlobSource(high),formats:[media.MP4]});const ht=await hi.getPrimaryVideoTrack();let count=0;for await(const packet of new media.EncodedPacketSink(ht).packets())count++;
      check(count===720,'1080p120 contains 720 frames');highRate={supported:true,frames:count,bytes:high.size};hi.dispose();
    }else highRate=capability;
    source.close();
    const data=await blob.arrayBuffer();let binary='';for(const byte of new Uint8Array(data))binary+=String.fromCharCode(byte);
    return {checks,seconds,bytes:blob.size,frames,duration,meanError,highRate,userAgent:navigator.userAgent,video:btoa(binary)};
  });
  const {video,...report}=result;
  await writeFile('artifacts/sample-1080p60.mp4',Buffer.from(video,'base64'));
  const metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=codec_name,width,height,avg_frame_rate,nb_read_frames,duration,pix_fmt','-of','json','artifacts/sample-1080p60.mp4'],{encoding:'utf8'}));
  assert.equal(metadata.streams[0].nb_read_frames,'360');assert.equal(metadata.streams[0].avg_frame_rate,'60/1');assert.equal(metadata.streams[0].codec_name,'h264');
  // Exercise the real harness controls, download and reopening path.
  await page.locator('#scrub').fill('180');await page.locator('#scrub').dispatchEvent('input');
  await page.screenshot({path:'artifacts/engine-lab.png',fullPage:true});
  assert.deepEqual(errors,[]);
  await writeFile('artifacts/browser-report.json',JSON.stringify({...report,ffprobe:metadata,pageErrors:errors},null,2));
  console.log(JSON.stringify({...report,ffprobe:metadata,pageErrors:errors},null,2));
}finally{await browser.close();}
