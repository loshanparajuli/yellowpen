import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, release } from 'node:os';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5174','--strictPort'],{stdio:['ignore','pipe','pipe']});
let browser;
try{
  await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(new Error('Preview server startup timeout')),10000);server.stdout.on('data',d=>{log+=d;if(log.includes('127.0.0.1:5174')){clearTimeout(timer);resolve();}});server.on('exit',code=>{clearTimeout(timer);reject(new Error(`Preview exited ${code}`));});});
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({acceptDownloads:true,viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174');await page.locator('#status').filter({hasText:'Drag to highlight.'}).waitFor();
  assert.equal(await page.locator('#fps').inputValue(),'60');
  await page.locator('#fineTune summary').click();
  await page.locator('#dim').selectOption('outside');await page.locator('#texture').selectOption('felt-tip');await page.locator('#roughness').fill('0.1');await page.locator('#roughness').dispatchEvent('change');
  await page.locator('#undo').click();assert.equal(await page.locator('#roughness').inputValue(),'0');await page.locator('#redo').click();assert.equal(await page.locator('#roughness').inputValue(),'0.1');
  // Test a changed export rate, then return to the confirmed default.
  await page.locator('#fps').selectOption('120');await page.locator('#fps').selectOption('60');
  await page.locator('.project-menu summary').click();
  const saved=page.waitForEvent('download');await page.locator('#save').click();const project=await saved;
  await mkdir('artifacts',{recursive:true});await project.saveAs('artifacts/sample.yellowpen');
  await page.locator('#opacity').fill('0.2');await page.locator('#opacity').dispatchEvent('change');
  await page.locator('#open').setInputFiles('artifacts/sample.yellowpen');
  await page.waitForFunction(()=>document.querySelector('#opacity').value==='1');
  const download=page.waitForEvent('download',{timeout:90000});const start=Date.now();await page.locator('#export').click();const mp4=await download;await mp4.saveAs('artifacts/production-1080p60.mp4');
  const metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=codec_name,width,height,avg_frame_rate,nb_read_frames,duration','-of','json','artifacts/production-1080p60.mp4'],{encoding:'utf8'}));
  assert.equal(metadata.streams[0].nb_read_frames,'360');assert.equal(metadata.streams[0].avg_frame_rate,'60/1');
  await page.locator('#scrub').fill('180');await page.locator('#scrub').dispatchEvent('input');
  await page.screenshot({path:'artifacts/production-lab.png',fullPage:true});
  const before=await page.locator('#json').inputValue();await page.reload();await page.locator('#status').filter({hasText:'Drag to highlight.'}).waitFor();assert.equal(await page.locator('#json').inputValue(),before);
  assert.deepEqual(errors,[]);
  const report={passed:true,checks:['production worker export','real UI export download','undo/redo','portable save/open','autosave reload','1080p60 frame count'],seconds:(Date.now()-start)/1000,machine:{cpu:cpus()[0]?.model,platform:platform(),release:release()},metadata,errors};
  await writeFile('artifacts/production-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();server.kill('SIGTERM');}
