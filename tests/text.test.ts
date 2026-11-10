import { describe,it,expect } from 'vitest';
import { layoutText,selectionRegions } from '../src/text/layout';
const measure=(s:string)=>Array.from(s).length*10;
describe('text selection geometry',()=>{
 it('uses offsets to distinguish repeated phrases',()=>{const text='same words\nsame words';const l=layoutText(text,measure);const r=selectionRegions(l,11,15,measure);expect(r).toHaveLength(1);expect(r[0].y).toBeCloseTo(l.lines[1].y-68*.96);expect(r[0].width).toBe(40);});
 it('splits wrapped selection into exact line regions',()=>{const l=layoutText('alpha beta gamma',measure,68,340);expect(l.lines.map(x=>x.text)).toEqual(['alpha','beta gamma']);expect(selectionRegions(l,0,16,measure)).toHaveLength(2);});
 it('preserves unicode UTF16 offsets',()=>{const l=layoutText('a😀 b\nnext',measure);expect(l.lines[1].start).toBe(6);expect(selectionRegions(l,1,3,measure)[0].width).toBe(10);});
 it('rejects whitespace-only line selection',()=>{const l=layoutText('hello\n\nworld',measure);expect(()=>selectionRegions(l,6,7,measure)).toThrow();});
 it('positions underline below text baseline',()=>{const l=layoutText('hello',measure);expect(selectionRegions(l,0,5,measure)[0].stroke.start.y).toBeGreaterThan(l.lines[0].y);});
});

import { templateSchema,presets } from '../src/text/template';
import { createProject,parseProject } from '../src/core/project';
describe('reusable text templates',()=>{
 it('wraps sooner when custom text width is narrowed',()=>{const wide=layoutText('alpha beta gamma delta',measure,68,600,{padding:40,textWidth:100,lineSpacing:1.3});const narrow=layoutText('alpha beta gamma delta',measure,68,600,{padding:40,textWidth:40,lineSpacing:1.3});expect(narrow.lines.length).toBeGreaterThan(wide.lines.length);});
 it('applies vertical margins to text and selection geometry',()=>{const a=layoutText('hello',measure,68,1920,{padding:120,verticalPadding:40,textWidth:100,lineSpacing:1.48});const b=layoutText('hello',measure,68,1920,{padding:120,verticalPadding:240,textWidth:100,lineSpacing:1.48});expect(b.lines[0].y-a.lines[0].y).toBe(200);expect(selectionRegions(b,0,5,measure)[0].y-selectionRegions(a,0,5,measure)[0].y).toBe(200);expect(templateSchema.parse({}).verticalPadding).toBe(160);});
 it('Juniorist has tighter spacing and margins',()=>{expect(presets.Juniorist.padding).toBeLessThan(presets.Classic.padding);expect(presets.Juniorist.lineSpacing).toBeLessThan(presets.Classic.lineSpacing);});
 it('round trips template and source with project',()=>{const p=createProject(1920,1080);p.textDocument={text:'sample text',start:0,end:6,fontSize:68,font:'sans',template:templateSchema.parse({...presets.Juniorist,source:'Example',roughness:.7,distortion:.1})};expect(parseProject(JSON.parse(JSON.stringify(p))).textDocument?.template?.source).toBe('Example');});
 it('rejects unsafe image URLs and out-of-range settings',()=>{expect(()=>templateSchema.parse({logo:'https://example.com/a.png'})).toThrow();expect(()=>templateSchema.parse({padding:1000})).toThrow();expect(()=>templateSchema.parse({distortion:1})).toThrow();});
});

import { recoverFadedInk } from '../src/text/contrast';
import { cameraAt } from '../src/core/timeline';
describe('4K static shots and screenshot OCR',()=>{
 it('accepts full UHD 60 FPS and never moves a disabled camera',()=>{const p=createProject(3840,2160);p.output={width:3840,height:2160,fps:60,bitrate:50_000_000};p.camera.enabled=false;const validated=parseProject(p);for(const t of [0,.8,1.4,2,5.99])expect(cameraAt(validated,t)).toEqual(cameraAt(validated,0));});
 it('rejects output larger than UHD',()=>{const p=createProject(3840,2160);p.output={width:3840,height:3840,fps:60,bitrate:50_000_000};expect(()=>parseProject(p)).toThrow();});
 it('recovers pale gray ink without turning white paper dark',()=>{const pixels=new Uint8ClampedArray(400).fill(255);pixels.set([222,222,222,255],4);expect(recoverFadedInk(pixels)).toBe(true);expect(Array.from(pixels.slice(4,8))).toEqual([0,0,0,255]);expect(Array.from(pixels.slice(0,4))).toEqual([255,255,255,255]);});
 it('leaves dark photographs unchanged',()=>{const pixels=new Uint8ClampedArray([30,60,90,255,100,110,120,255]);const before=pixels.slice();expect(recoverFadedInk(pixels)).toBe(false);expect(pixels).toEqual(before);});
});

import { textTiming } from '../src/text/timing';
import { frameCount } from '../src/core/project';

describe('adjustable timing',()=>{
 it('keeps the original six-second timing by default',()=>{const t=textTiming(6,.9);expect(t.duration).toBe(6);expect(t.start).toBe(1.4);expect(t.reveal).toBe(.9);expect(t.hold).toBeCloseTo(3.7);});
 it('keeps short and long shots valid with a complete highlight',()=>{
  for(const duration of [2,4.5,20])for(const reveal of [.2,.9,18]){
   const p=createProject(1920,1080),t=textTiming(duration,reveal);
   p.duration=t.duration;Object.assign(p.beats[0],{start:t.start,reveal:t.reveal,hold:t.hold});
   expect(()=>parseProject(p)).not.toThrow();expect(frameCount(p)).toBe(Math.round(duration*60));
   expect(t.start+t.reveal).toBeLessThanOrEqual(duration-.09);
  }
 });
 it('preserves timing through template serialization and defaults old templates',()=>{
  expect(templateSchema.parse({}).videoDuration).toBe(6);
  const t=templateSchema.parse({videoDuration:12,highlightDuration:3});
  expect(templateSchema.parse(JSON.parse(JSON.stringify(t))).highlightDuration).toBe(3);
 });
});
