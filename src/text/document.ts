import { createProject, parseProject, styleSchema } from '../core/project';
import { textTiming } from './timing';
import { templateSchema } from './template';
import type { TextTemplate } from './template';
import { layoutText, selectionRegions } from './layout';
export type TextDocument = { text: string; start: number; end: number; fontSize: number; font: 'sans' | 'serif'; template?:TextTemplate };
export async function composeText(doc: TextDocument, previewOnly = false) {
  if(!doc.text.trim())throw new Error('Add some text first.');
  if(doc.text.length>12000)throw new Error('Please use an excerpt under 12,000 characters.');
  if(doc.start<0||doc.end>doc.text.length||doc.start>=doc.end)throw new Error('Select the words you want to animate.');
  const template=templateSchema.parse(doc.template??{});
  const canvas=document.createElement('canvas');
  const font=`${doc.fontSize}px ${doc.font==='sans'?'Arial':'Georgia'}`;
  let ctx=canvas.getContext('2d')!;ctx.font=font;
  const measure=(text:string)=>ctx.measureText(text).width;
  const layout=layoutText(doc.text,measure,doc.fontSize,1920,template);
  const regions=selectionRegions(layout,doc.start,doc.end,measure);
  if(template.effect!=='underline')for(const region of regions)delete (region as {stroke?:unknown}).stroke;
  const scale=previewOnly ? .5 : 2;
  if(layout.width*layout.height*scale*scale>25_000_000||layout.height*scale>15000)throw new Error('This excerpt is too long for a sharp 4K shot. Keep a shorter passage.');
  canvas.width=layout.width*scale;canvas.height=layout.height*scale;
  ctx=canvas.getContext('2d')!;ctx.scale(scale,scale);ctx.font=font;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#121212';ctx.textBaseline='alphabetic';
  for(const line of layout.lines)ctx.fillText(line.text,line.x,line.y);
  if(template.logo){const logo=await createImageBitmap(await (await fetch(template.logo)).blob());ctx.drawImage(logo,0,0,320,100);logo.close();}
  const project=createProject(canvas.width,canvas.height);
  project.name='Text spotlight';project.textDocument=doc;
  project.output={width:3840,height:2160,fps:60,bitrate:50_000_000};
  project.camera.enabled=false;
  const timing=textTiming(template.videoDuration,template.highlightDuration);
  project.duration=timing.duration;
  Object.assign(project.beats[0],{start:timing.start,reveal:timing.reveal,hold:timing.hold});
  project.beats[0].regions=regions.map(r=>({...r,x:r.x*scale,y:r.y*scale,width:r.width*scale,height:r.height*scale,...(r.stroke?{stroke:{start:{x:r.stroke.start.x*scale,y:r.stroke.start.y*scale},end:{x:r.stroke.end.x*scale,y:r.stroke.end.y*scale}}}:{})}));
  project.beats[0].style=styleSchema.parse({effect:template.effect,color:template.color,opacity:template.opacity,blend:template.effect==='marker'?'multiply':'source-over',thickness:template.effect==='underline'?0.4:1,radius:template.radius,
    texture:template.roughness>0?'felt-tip':'solid',textureStrength:template.roughness,displacement:template.distortion,
    dim:{target:'outside',amount:template.dim,color:'#FFFFFF'}});
  const parsed=parseProject(project);
  const image=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not create text template.')),'image/png'));
  return {project:parsed,image};
}
export { recognizeImage } from './ocr';
