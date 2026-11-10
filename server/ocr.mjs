import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const executable=fileURLToPath(new URL('../.native/yellowpen-ocr',import.meta.url));
const limit=12*1024*1024;
export function nativeOcrPlugin() {
  let busy=false;
  const middleware=(req,res,next)=>{
    if(req.url?.split('?')[0]==='/api/logo'){
      const host=req.headers.host??'';
      if(req.method!=='POST'||!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||req.headers.origin!==`http://${host}`){res.statusCode=403;res.end();return;}
      const domain=new URL(req.url,'http://localhost').searchParams.get('domain')??'';
      if(domain.length>253||!/^([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(domain)){res.statusCode=400;res.end('Invalid domain');return;}
      // Only this fixed favicon provider is contacted; supplied domains never become fetch hosts.
      fetch('https://www.google.com/s2/favicons?domain='+encodeURIComponent(domain)+'&sz=128',{signal:AbortSignal.timeout(8000)}).then(async response=>{
        if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error('No icon');
        const body=await response.arrayBuffer();if(body.byteLength>200000)throw new Error('Icon too large');
        res.setHeader('Content-Type',response.headers.get('content-type'));res.setHeader('Cache-Control','no-store');res.end(Buffer.from(body));
      }).catch(()=>{if(!res.writableEnded){res.statusCode=502;res.end('Icon lookup unavailable. Upload a logo instead.');}});return;
    }
    if (req.url?.split('?')[0] !== '/api/ocr') return next();
    res.setHeader('Cache-Control','no-store');
    const reply=(code,data)=>{ if(res.destroyed || res.writableEnded)return;res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data)); };
    const host=req.headers.host ?? '';
    if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))return reply(403,{error:'OCR is available only on localhost.'});
    if(req.method==='GET')return reply(200,{available:process.platform==='darwin'&&existsSync(executable),engine:'Apple Vision'});
    if(req.method!=='POST')return reply(405,{error:'Use POST.'});
    if(req.headers.origin!==`http://${host}` || req.headers['x-yellowpen-ocr']!=='1')return reply(403,{error:'Only the local YellowPen app can request OCR.'});
    if(!['image/png','image/jpeg'].includes(req.headers['content-type']))return reply(415,{error:'Choose a PNG or JPEG.'});
    if(!existsSync(executable)||process.platform!=='darwin')return reply(503,{error:'Native OCR is unavailable. Run npm run native:build on a Mac, or paste text directly.'});
    if(busy)return reply(429,{error:'An image is already being read. Please try again shortly.'});
    if(Number(req.headers['content-length'])>limit)return reply(413,{error:'Image exceeds 12 MB.'});
    busy=true;
    let bytes=0,chunks=[],child,finished=false;
    const timeout=setTimeout(()=>{reply(408,{error:'Reading timed out. Try a smaller crop, or paste the text.'});finish();},30000);
    function finish(){if(finished)return;finished=true;clearTimeout(timeout);child?.kill();chunks=[];busy=false;}
    res.on('close',finish);req.on('aborted',finish);req.on('error',()=>{reply(400,{error:'Image transfer failed.'});finish();});
    req.on('data',chunk=>{if(finished)return;bytes+=chunk.length;if(bytes>limit){reply(413,{error:'Image exceeds 12 MB.'});finish();return;}chunks.push(chunk);});
    req.on('end',()=>{
      if(finished)return;
      child=spawn(executable,[],{stdio:['pipe','pipe','pipe']});
      let stdout='',stderr='';
      child.stdout.on('data',b=>{stdout+=b.toString();if(stdout.length>2_000_000){reply(422,{error:'Too much text. Crop the image.'});finish();}});
      child.stderr.on('data',b=>{if(stderr.length<4000)stderr+=b.toString();});
      child.on('error',()=>{reply(503,{error:'Native OCR could not start. Paste text instead.'});finish();});
      child.on('close',code=>{if(finished)return;try{if(code!==0)throw new Error(stderr||'OCR failed.');const data=JSON.parse(stdout);if(typeof data.text!=='string')throw new Error('OCR returned invalid data.');reply(200,data);}catch(e){reply(422,{error:e.message});}finally{finish();}});
      child.stdin.on('error',()=>{});child.stdin.end(Buffer.concat(chunks));chunks=[];
    });
  };
  return {name:'yellowpen-native-ocr',configureServer(server){server.middlewares.use(middleware);},configurePreviewServer(server){server.middlewares.use(middleware);}};
}
