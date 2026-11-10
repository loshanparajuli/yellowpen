import { parseProject } from '../core/project';
import type { Project } from '../core/project';
import type { ExportOptions } from './mp4';
/** Fresh worker per job: render work is isolated from UI and resources are reclaimed at termination. */
export function exportInWorker(project: Project, image: Blob, options: ExportOptions = {}): Promise<Blob> {
  const snapshot = parseProject(project);
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) { reject(new DOMException('Export cancelled.', 'AbortError')); return; }
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelTimer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => { clearTimeout(cancelTimer); clearTimeout(stallTimer); options.signal?.removeEventListener('abort', abort); worker.terminate(); };
    const abort = () => {
      worker.postMessage({ type: 'cancel' });
      // A stalled platform codec must not hold the UI hostage.
      cancelTimer = setTimeout(() => { cleanup(); reject(new DOMException('Export cancelled.', 'AbortError')); }, 1500);
    };
    const armWatchdog = () => { clearTimeout(stallTimer); stallTimer = setTimeout(() => {
      cleanup(); reject(new Error('The video encoder stopped responding. Your project is safe. Try exporting again, or open it in a current desktop Chrome browser.'));
    }, 45_000); };
    armWatchdog();
    options.signal?.addEventListener('abort', abort, { once: true });
    worker.onerror = event => { cleanup(); reject(new Error(event.message || 'Export worker failed.')); };
    worker.onmessage = event => {
      if (event.data.type === 'progress') { armWatchdog(); options.onProgress?.(event.data.progress); }
      else if (event.data.type === 'complete') {
        cleanup();
        if (options.signal?.aborted) reject(new DOMException('Export cancelled.', 'AbortError')); else resolve(event.data.blob);
      } else if (event.data.type === 'error') { cleanup(); const error = new Error(event.data.message); error.name = event.data.name; reject(error); }
    };
    worker.postMessage({ type: 'export', project: snapshot, image });
  });
}
