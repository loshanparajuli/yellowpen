import { z } from 'zod';
export const templateSchema=z.strictObject({
 videoDuration:z.number().min(2).max(20).default(6),
 highlightDuration:z.number().min(.2).max(18).default(.9),
 name:z.string().min(1).max(60).default('Custom'),
 effect:z.enum(['underline','marker','invert','spotlight']).default('underline'),
 color:z.string().regex(/^#[a-fA-F0-9]{6}$/).default('#D92127'),
 roughness:z.number().min(0).max(1).default(0), distortion:z.number().min(0).max(.2).default(0),
 radius:z.number().min(0).max(1).default(0), opacity:z.number().min(0).max(1).default(1),
 dim:z.number().min(0).max(1).default(.86),
 verticalPadding:z.number().min(40).max(300).default(160),
 padding:z.number().min(40).max(300).default(120),textWidth:z.number().min(40).max(100).default(100),
 lineSpacing:z.number().min(1.2).max(2).default(1.48),fontSize:z.number().min(36).max(100).default(68),
 font:z.enum(['sans','serif']).default('sans'),zoom:z.number().min(.5).max(2).default(1.15),
 source:z.string().max(200).default(''),website:z.string().max(100).default(''),
 logo:z.string().max(180000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/).optional(),
});
export type TextTemplate=z.infer<typeof templateSchema>;
export const presets:Record<string,TextTemplate>={
 'Juniorist':templateSchema.parse({name:'Juniorist',padding:60,lineSpacing:1.25,fontSize:64}),
 'Nepali Comment':templateSchema.parse({name:'Nepali Comment',effect:'marker',color:'#FFE34D',opacity:.65,roughness:.45,distortion:.06,padding:100,lineSpacing:1.6,dim:.6}),
 'Classic':templateSchema.parse({name:'Classic'}),
};
export function readTemplates():TextTemplate[]{try{return z.array(templateSchema).max(30).parse(JSON.parse(localStorage.getItem('yellowpen-templates')||'[]'));}catch{return [];}}
export function saveTemplate(t:TextTemplate){const value=templateSchema.parse(t),all=readTemplates().filter(x=>x.name!==value.name);if(all.length>=30)throw new Error('You can save up to 30 templates. Reuse an existing name to replace one.');localStorage.setItem('yellowpen-templates',JSON.stringify([...all,value]));}
export async function logoData(blob:Blob):Promise<string>{if(!['image/png','image/jpeg','image/webp','image/x-icon','image/vnd.microsoft.icon'].includes(blob.type)||blob.size>2_000_000)throw new Error('Choose a PNG, JPG or WebP logo under 2 MB.');const image=await createImageBitmap(blob);try{const c=document.createElement('canvas');c.width=320;c.height=100;const ctx=c.getContext('2d')!;const s=Math.min(320/image.width,100/image.height);ctx.drawImage(image,0,0,image.width*s,image.height*s);return c.toDataURL('image/png');}finally{image.close();}}
