import { describe, expect, it } from 'vitest';
import { createProject, parseProject, frameCount, withFps } from '../src/core/project';
import { applyTransform, invertTransform, evaluateFrame, regionProgress, cameraAt, noise } from '../src/core/timeline';
import { ProjectHistory } from '../src/core/history';

describe('project contract', () => {
  it('defaults to six-second 1080p60 and preserves seconds at 120 fps', () => {
    const p=createProject(1600,1100), next=withFps(p,120);
    expect(p.output).toMatchObject({width:1920,height:1080,fps:60});expect(p.beats[0].style).toMatchObject({effect:'invert',opacity:1,radius:0,dim:{target:'outside',amount:0.72,color:'#FFFFFF'}});expect(frameCount(p)).toBe(360);expect(frameCount(next)).toBe(720);
    expect(next.beats).toEqual(p.beats); expect(next.duration).toBe(p.duration);
    expect(evaluateFrame(p,100).camera).toEqual(evaluateFrame(next,200).camera);
  });
  it.each([
    (p:any)=>{p.source.width=Infinity;},
    (p:any)=>{p.beats[0].regions[0].width=99999;},
    (p:any)=>{p.output.width=1919;},
    (p:any)=>{p.beats[0].reveal=20;},
    (p:any)=>{p.beats[0].style.trimStart=1;},
    (p:any)=>{p.beats[0].regions[0].stroke={start:{x:1,y:1},end:{x:1,y:1}};},
    (p:any)=>{p.output.fps=59;},
    (p:any)=>{p.schemaVersion=99;},
    (p:any)=>{p.beats[0].style.unsupportedEffect=true;},
    (p:any)=>{p.beats.push(structuredClone(p.beats[0]));},
  ])('rejects invalid imported projects', change=>{const p=createProject(1600,1100);change(p);expect(()=>parseProject(p)).toThrow();});
  it('ignores no-op edits without losing redo',()=>{
    const p=createProject(1600,1100),h=new ProjectHistory(p);h.commit(p);expect(h.canUndo).toBe(false);
    h.commit({...p,name:'edited'});h.undo();h.commit(p);expect(h.canRedo).toBe(true);
  });
  it('isolates history snapshots and clears redo after a new edit',()=>{
    const p=createProject(1600,1100), h=new ProjectHistory(p);p.name='outside mutation';expect(h.current.name).toBe('Untitled shot');
    const next=h.current;next.name='new';h.commit(next);expect(h.undo().name).toBe('Untitled shot');expect(h.redo().name).toBe('new');h.undo();h.commit({...h.current,name:'branch'});expect(h.canRedo).toBe(false);
  });
});
describe('geometry and deterministic timing',()=>{
  it('rejects nonfinite and fractional frame indices',()=>{
    const p=createProject(1600,1100);
    for(const frame of [NaN,Infinity,1.5]) expect(()=>evaluateFrame(p,frame)).toThrow();
  });
  it('roundtrips source coordinates at a zoomed camera position',()=>{
    const t=cameraAt(createProject(1600,1100),2), point={x:234.5,y:689};const result=invertTransform(applyTransform(point,t),t);
    expect(result.x).toBeCloseTo(point.x,10);expect(result.y).toBeCloseTo(point.y,10);
  });
  it('reveals wrapped lines in proportion to path length',()=>{
    const b=createProject(1600,1100).beats[0];b.start=1;b.reveal=3;b.style.easing='linear';b.regions=[{x:0,y:0,width:200,height:20},{x:0,y:30,width:100,height:20}];
    expect(regionProgress(b,0)).toEqual([0,0]);expect(regionProgress(b,2)).toEqual([0.5,0]);expect(regionProgress(b,3.5)).toEqual([1,0.5]);expect(regionProgress(b,5)).toEqual([1,1]);
  });
  it('does not jump when closely spaced camera moves overlap',()=>{
    const p=createProject(1600,1100);p.beats[0].start=1;p.beats[0].hold=0;
    p.beats.push({...structuredClone(p.beats[0]),id:'b2',start:1.2,regions:[{x:1000,y:800,width:200,height:50}]});
    const start=1.2-p.camera.moveDuration*0.82, a=cameraAt(p,start-1e-7),b=cameraAt(p,start);
    expect(a.scale).toBeCloseTo(b.scale,5);expect(a.x).toBeCloseTo(b.x,3);expect(a.y).toBeCloseTo(b.y,3);
  });
  it('is independent of seek order and RNG state',()=>{
    const p=createProject(1600,1100), before=evaluateFrame(p,100);evaluateFrame(p,350);evaluateFrame(p,1);expect(evaluateFrame(p,100)).toEqual(before);
    expect(noise(42,12)).toBe(noise(42,12));expect(noise(43,12)).not.toBe(noise(42,12));
  });
});
