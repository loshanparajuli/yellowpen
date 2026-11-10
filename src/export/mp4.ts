import { BufferTarget, EncodedPacket, EncodedVideoPacketSource, Input, BlobSource, MP4, Output, Mp4OutputFormat, VideoSampleSink } from 'mediabunny';
import { parseProject, frameCount } from '../core/project';
import type { Project } from '../core/project';
import { Renderer, makeSurface } from '../render/renderer';

export type ExportProgress = { phase: 'probing' | 'rendering' | 'finalizing'; completed: number; total: number };
export type ExportOptions = { signal?: AbortSignal; onProgress?: (progress: ExportProgress) => void };
function checkAbort(signal?: AbortSignal) { if (signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError'); }
const encoderConfig = (p: Project): VideoEncoderConfig => ({
  codec: 'avc1.640034', width: p.output.width, height: p.output.height,
  bitrate: p.output.bitrate, framerate: p.output.fps,
  latencyMode: 'quality', avc: { format: 'avc' },
});
export async function checkCapability(project: Project) {
  const p = parseProject(project);
  if (!globalThis.isSecureContext || typeof VideoEncoder === 'undefined') return { supported: false, reason: 'WebCodecs requires a supported browser on HTTPS or localhost.' };
  const { supported } = await VideoEncoder.isConfigSupported(encoderConfig(p));
  return { supported, reason: supported ? 'Checking a real encode next.' : `H.264 ${p.output.width}×${p.output.height} at ${p.output.fps} fps is unavailable on this device. Try a current desktop browser.` };
}
async function encode(p: Project, source: CanvasImageSource, count: number, options: ExportOptions): Promise<Blob> {
  const canvas = makeSurface(p.output.width, p.output.height), renderer = new Renderer(p, source, canvas);
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const video = new EncodedVideoPacketSource('avc');
  let encoded = 0, encoderError: Error | undefined;
  let writes = Promise.resolve();
  const encoder = new VideoEncoder({
    output(chunk, metadata) {
      encoded++;
      writes = writes.then(() => video.add(EncodedPacket.fromEncodedChunk(chunk), metadata));
      // Attach a handler immediately: errors are surfaced after each bounded batch.
      void writes.catch(error => { encoderError = error; });
    },
    error(error) { encoderError = error; },
  });
  output.addVideoTrack(video, { frameRate: p.output.fps });
  // Cancellation must release encoder backpressure even while add() is pending.
  let cancellation: Promise<void> | undefined;
  const abort = () => { if (encoder.state !== 'closed') encoder.close(); cancellation ??= output.cancel().catch(() => {}); };
  options.signal?.addEventListener('abort', abort, { once: true });
  try {
    checkAbort(options.signal); encoder.configure(encoderConfig(p)); await output.start();
    for (let i = 0; i < count; i++) {
      checkAbort(options.signal); renderer.render(i);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * 1_000_000 / p.output.fps), duration: Math.round((i + 1) * 1_000_000 / p.output.fps) - Math.round(i * 1_000_000 / p.output.fps) });
      try { encoder.encode(frame, { keyFrame: i % 4 === 0 }); } finally { frame.close(); }
      // Explicit flushing breaks quality-mode lookahead/backpressure deadlocks.
      // Four frames also bound retained 4K surfaces. A flush requires the next frame to be a keyframe.
      if ((i + 1) % 4 === 0 || i + 1 === count) {
        await encoder.flush(); await writes;
        if (encoderError) throw encoderError;
        options.onProgress?.({ phase: 'rendering', completed: i + 1, total: count });
      }
      // Yield for cancel/input handling even if the encoder's promises resolve synchronously.
      if (i % 8 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    checkAbort(options.signal);
    if (encoded !== count) throw new Error(`Encoder returned ${encoded} of ${count} frames. Please retry export.`);
    video.close();
    options.onProgress?.({ phase: 'finalizing', completed: count, total: count });
    await output.finalize(); checkAbort(options.signal);
    if (!output.target.buffer) throw new Error('Encoder produced no output.');
    return new Blob([output.target.buffer], { type: 'video/mp4' });
  } catch (error) {
    await (cancellation ?? output.cancel().catch(() => {}));
    checkAbort(options.signal); throw error;
  } finally {
    options.signal?.removeEventListener('abort', abort);
    if (encoder.state !== 'closed') encoder.close();
    renderer.dispose(); canvas.width = canvas.height = 1;
  }
}
/** Performs a real encode and decodes a sample before committing to the full shot. */
export async function probeExport(project: Project, source: CanvasImageSource, signal?: AbortSignal) {
  checkAbort(signal);
  const result = await checkCapability(project);
  if (!result.supported) throw new Error(result.reason);
  const blob = await encode(project, source, 12, { signal });
  checkAbort(signal);
  const input = new Input({ source: new BlobSource(blob), formats: [MP4] });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('Export probe has no video track.');
    const sample = await new VideoSampleSink(track).getSample(0);
    if (!sample) throw new Error('Browser could not decode its exported MP4.');
    sample.close(); checkAbort(signal);
  } finally { input.dispose(); }
}
export async function exportMp4(project: Project, source: CanvasImageSource, options: ExportOptions = {}) {
  const snapshot = parseProject(project); // Parsing clones the input; UI mutations cannot change an active job.
  checkAbort(options.signal);
  options.onProgress?.({ phase: 'probing', completed: 0, total: frameCount(snapshot) });
  await probeExport(snapshot, source, options.signal);
  return encode(snapshot, source, frameCount(snapshot), options);
}
