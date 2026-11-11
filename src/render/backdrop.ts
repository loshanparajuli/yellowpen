import { z } from 'zod';
export const backdropSchema=z.strictObject({
 preset:z.enum(['paper','sand','slate','midnight','lavender','image','custom']).default('paper'),
 color:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#e8e6e1'),
 distance:z.number().min(0).max(30).default(10),
 blur:z.number().min(0).max(80).default(24),
 radius:z.number().min(0).max(60).default(16),
 shadow:z.number().min(0).max(100).default(35),
});
export type Backdrop=z.infer<typeof backdropSchema>;
export function screenshotRect(sw:number,sh:number,w:number,h:number,distance:number){
 const inset=Math.min(w,h)*distance/100,scale=Math.min((w-2*inset)/sw,(h-2*inset)/sh);
 return {x:(w-sw*scale)/2,y:(h-sh*scale)/2,width:sw*scale,height:sh*scale};
}
export function drawScreenshot(ctx:CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D,image:CanvasImageSource,sw:number,sh:number,w:number,h:number,b:Backdrop){
 ctx.save();ctx.resetTransform();ctx.fillStyle=b.color;ctx.fillRect(0,0,w,h);
 const palettes:Record<string,string[]>={paper:['#fafafa','#dfe3e8'],sand:['#f4ebdf','#c9b7a2'],slate:['#9aabba','#445365'],midnight:['#303b53','#0e1320'],lavender:['#e9e4f3','#a9b1cd']};
 if(palettes[b.preset]){const colors=palettes[b.preset],g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
 if(b.preset==='image'){
  const bleed=b.blur*w/1920*3+10,scale=Math.max((w+bleed*2)/sw,(h+bleed*2)/sh);
  ctx.save();ctx.filter=`blur(${b.blur*w/1920}px)`;ctx.drawImage(image,(w-sw*scale)/2,(h-sh*scale)/2,sw*scale,sh*scale);ctx.restore();
  ctx.fillStyle='#11182722';ctx.fillRect(0,0,w,h);
 }
 const r=screenshotRect(sw,sh,w,h,b.distance),radius=Math.min(b.radius*w/1920,r.width/2,r.height/2);
 ctx.save();ctx.shadowColor=`rgba(0,0,0,${b.shadow/100*.55})`;ctx.shadowBlur=48*w/1920;ctx.shadowOffsetY=14*w/1920;
 ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(r.x,r.y,r.width,r.height,radius);ctx.fill();ctx.restore();
 ctx.beginPath();ctx.roundRect(r.x,r.y,r.width,r.height,radius);ctx.clip();ctx.drawImage(image,r.x,r.y,r.width,r.height);ctx.restore();
}
