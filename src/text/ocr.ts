import { recoverFadedInk } from './contrast';
import { decodeImage } from '../storage/image';
import type { Worker } from 'tesseract.js';
/** Self-hosted engine and language data; image pixels never leave the browser. */
export async function recognizeImage(image:Blob,signal?:AbortSignal,onProgress?:(message:string)=>void){
  if(image.size>12*1024*1024)throw new Error('Use an image under 12 MB.');
  if(signal?.aborted)throw new DOMException('Reading cancelled.','AbortError');
  const decoded=await decodeImage(image);
  // Recover faded text in near-white document screenshots before global OCR thresholding.
  const surface=document.createElement('canvas');surface.width=decoded.width;surface.height=decoded.height;
  const context=surface.getContext('2d',{willReadFrequently:true})!;context.fillStyle='#fff';context.fillRect(0,0,surface.width,surface.height);context.drawImage(decoded,0,0);decoded.close();
  const pixels=context.getImageData(0,0,surface.width,surface.height);
  if(recoverFadedInk(pixels.data))context.putImageData(pixels,0,0);
  const prepared=await new Promise<Blob>((resolve,reject)=>surface.toBlob(b=>b?resolve(b):reject(new Error('Could not prepare image.')),'image/png'));
  surface.width=surface.height=1;
  let worker:Worker|undefined,closed=false,timer:ReturnType<typeof setTimeout>|undefined;
  let rejectStop:(error:Error)=>void=()=>{};
  const stopped=new Promise<never>((_,reject)=>{rejectStop=reject;});
  const stop=(error:Error)=>{closed=true;void worker?.terminate();rejectStop(error);};
  const abort=()=>stop(new DOMException('Reading cancelled.','AbortError'));
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)abort();
  timer=setTimeout(()=>stop(new Error('OCR timed out. Try a smaller image or paste the text.')),120000);
  const task=(async()=>{
    const {createWorker}=await import('tesseract.js');
    if(closed)throw new DOMException('Reading cancelled.','AbortError');
    const base=new URL('ocr/',document.baseURI).href;
    worker=await createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base,workerBlobURL:false,
      logger:m=>{if(!closed)onProgress?.(m.status==='recognizing text'?`Reading text · ${Math.round(m.progress*100)}%`:'Loading browser OCR…');},
      errorHandler:e=>stop(new Error(typeof e==='string'?e:'Browser OCR failed. Paste text or try another image.'))});
    if(closed){await worker.terminate();throw new DOMException('Reading cancelled.','AbortError');}
    const {data}=await worker.recognize(prepared);
    const text=data.text.trim();
    if(!text)throw new Error('No readable text found. Try a clearer image or paste text.');
    if(text.length>12000)throw new Error('Too much text for one shot. Crop to the passage you need.');
    return {text,engine:'Tesseract (browser)',lines:text.split('\n').map(text=>({text,confidence:data.confidence/100}))};
  })();
  try{return await Promise.race([task,stopped]);}finally{closed=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);await worker?.terminate();}
}
