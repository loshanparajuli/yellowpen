/** UTF-16 offsets match DOM Range/textarea selections. Layout never changes the user's words. */
export type TextLine = { text: string; start: number; end: number; x: number; y: number; width: number };
export type TextLayout = { width: number; height: number; fontSize: number; lines: TextLine[] };
export function layoutText(text: string, measure: (text: string)=>number, fontSize=68, width=1920, options?: {verticalPadding?:number;padding:number;lineSpacing:number;textWidth:number}): TextLayout {
  const verticalMargin=options?.verticalPadding??160;
  const margin=options?.padding??120, lineHeight=fontSize*(options?.lineSpacing??1.48), available=(width-margin*2)*(options?.textWidth??100)/100;
  const lines: TextLine[]=[];
  let paragraphStart=0;
  for(const paragraph of text.split('\n')) {
    if(!paragraph.length) { lines.push({text:'',start:paragraphStart,end:paragraphStart,x:margin,y:0,width:0}); }
    let at=0;
    while(at<paragraph.length){
      let end=at, lastSpace=-1;
      for(const char of paragraph.slice(at)) {
        const next=end+char.length;
        if(measure(paragraph.slice(at,next))>available && end>at)break;
        end=next;if(/\s/u.test(char))lastSpace=end;
      }
      if(end<paragraph.length && lastSpace>at)end=lastSpace;
      const raw=paragraph.slice(at,end), visible=raw.trimEnd();
      lines.push({text:visible,start:paragraphStart+at,end:paragraphStart+at+visible.length,x:margin,y:0,width:measure(visible)});
      at=end;
      // Whitespace skipped at a wrap retains its original offset, never silently joins words.
      while(at<paragraph.length && /\s/u.test(paragraph[at]))at++;
    }
    paragraphStart+=paragraph.length+1;
  }
  if(lines.length>100)throw new Error('This is too much text for one shot. Keep a shorter excerpt (up to 100 lines).');
  const height=Math.max(1080,Math.ceil(verticalMargin*2+lines.length*lineHeight));
  for(let i=0;i<lines.length;i++)lines[i].y=verticalMargin+fontSize+i*lineHeight;
  return {width,height,fontSize,lines};
}
export function selectionRegions(layout: TextLayout, start: number, end: number, measure: (text:string)=>number) {
  const regions=layout.lines.flatMap(line=>{
    const a=Math.max(start,line.start),b=Math.min(end,line.end);
    if(a>=b)return [];
    const leading=line.text.slice(0,a-line.start), through=line.text.slice(0,b-line.start);
    const x=line.x+measure(leading), width=measure(through)-measure(leading);
    return width>0?[{x,y:line.y-layout.fontSize*0.96,width,height:layout.fontSize*1.2,
      stroke:{start:{x,y:line.y+layout.fontSize*0.17},end:{x:x+width,y:line.y+layout.fontSize*0.17}}}]:[];
  });
  if(!regions.length)throw new Error('Select at least one visible word.');
  if(regions.length>32)throw new Error('Choose a shorter passage (up to 32 lines).');
  return regions;
}
