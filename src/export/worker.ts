import { exportMp4 } from './mp4';
import { decodeImage } from '../storage/image';
const controller = new AbortController();
self.onmessage = async (event: MessageEvent) => {
  if (event.data.type === 'cancel') { controller.abort(); return; }
  if (event.data.type !== 'export') return;
  let image: ImageBitmap | undefined;
  try {
    image = await decodeImage(event.data.image);
    const blob = await exportMp4(event.data.project, image, { signal: controller.signal, onProgress: progress => self.postMessage({ type: 'progress', progress }) });
    self.postMessage({ type: 'complete', blob });
  } catch (error) {
    self.postMessage({ type: 'error', name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : String(error) });
  } finally { image?.close(); }
};
