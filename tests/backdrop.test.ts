import { expect,it } from 'vitest';
import { backdropSchema,screenshotRect } from '../src/render/backdrop';
import { createProject,parseProject } from '../src/core/project';
it('contains portrait and landscape screenshots without cropping at all spacings',()=>{
 for(const [sw,sh] of [[300,1500],[2000,500],[1000,1000]])for(const distance of [0,10,30]){
 const r=screenshotRect(sw,sh,3840,2160,distance);
 expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);
 expect(r.x+r.width).toBeLessThanOrEqual(3840);expect(r.y+r.height).toBeLessThanOrEqual(2160);
 expect(r.width/r.height).toBeCloseTo(sw/sh);
 }
});
it('round trips editable screenshot styling and rejects unsafe settings',()=>{
 const p=createProject(1200,630);p.screenshotDocument=backdropSchema.parse({preset:'image',blur:50,distance:20});
 expect(parseProject(JSON.parse(JSON.stringify(p))).screenshotDocument?.blur).toBe(50);
 expect(()=>backdropSchema.parse({distance:60})).toThrow();expect(()=>backdropSchema.parse({color:'url(https://bad)'})).toThrow();
});
it('preserves source-relative highlight regions when backdrop spacing changes',()=>{
 const p=createProject(1200,630);p.screenshotDocument=backdropSchema.parse({distance:10});p.screenshotHighlights=true;
 p.beats[0].regions=[{x:120,y:150,width:420,height:40}];
 const saved=parseProject(JSON.parse(JSON.stringify(p)));saved.screenshotDocument!.distance=25;
 expect(parseProject(saved).beats[0].regions).toEqual(p.beats[0].regions);
 for(const distance of [0,10,25,30]){const r=screenshotRect(1200,630,3840,2160,distance);const x=r.x+120*r.width/1200;expect((x-r.x)*1200/r.width).toBeCloseTo(120);}
 expect(parseProject({...p,screenshotHighlights:undefined}).screenshotHighlights).toBe(false);
});
