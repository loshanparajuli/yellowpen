import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { exportInWorker } from '../src/export/client';
import { createProject } from '../src/core/project';
class FakeWorker {
 static current: FakeWorker;
 onmessage?: (event: {data: unknown})=>void;
 onerror?: (event: {message: string})=>void;
 postMessage=vi.fn(); terminate=vi.fn();
 constructor(){FakeWorker.current=this;}
 send(data:unknown){this.onmessage?.({data});}
}
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('Worker',FakeWorker);});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('terminates a codec stalled after early progress and permits a fresh export',async()=>{
 const job=exportInWorker(createProject(1920,1080),new Blob());
 const assertion=expect(job).rejects.toThrow('stopped responding');
 FakeWorker.current.send({type:'progress',progress:{phase:'rendering',completed:8,total:360}});
 await vi.advanceTimersByTimeAsync(45000);await assertion;
 expect(FakeWorker.current.terminate).toHaveBeenCalledOnce();
 const retry=exportInWorker(createProject(1920,1080),new Blob());
 const blob=new Blob(['mp4']);FakeWorker.current.send({type:'complete',blob});
 await expect(retry).resolves.toBe(blob);
});
it('does not time out a long export that continues making progress',async()=>{
 const job=exportInWorker(createProject(1920,1080),new Blob());
 for(let completed=4;completed<=16;completed+=4){await vi.advanceTimersByTimeAsync(30000);FakeWorker.current.send({type:'progress',progress:{phase:'rendering',completed,total:360}});}
 const blob=new Blob(['mp4']);FakeWorker.current.send({type:'complete',blob});
 await expect(job).resolves.toBe(blob);expect(vi.getTimerCount()).toBe(0);
});
it('cancel releases the UI even if the worker cannot handle messages',async()=>{
 const controller=new AbortController();
 const job=exportInWorker(createProject(1920,1080),new Blob(),{signal:controller.signal});
 const assertion=expect(job).rejects.toMatchObject({name:'AbortError'});
 controller.abort();await vi.advanceTimersByTimeAsync(1500);await assertion;
 expect(FakeWorker.current.terminate).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
