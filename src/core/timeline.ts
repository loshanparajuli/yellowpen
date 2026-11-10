import type { Beat, Easing, Point, Project, Rect, Region } from './project';
export const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export function ease(t: number, type: Easing): number {
  t = clamp(t);
  if (type === 'ease-in') return t * t * t;
  if (type === 'ease-out') return 1 - (1 - t) ** 3;
  if (type === 'ease-in-out') return t * t * (3 - 2 * t);
  return t;
}
export type Transform = { scale: number; x: number; y: number };
export function applyTransform(p: Point, t: Transform): Point { return { x: p.x * t.scale + t.x, y: p.y * t.scale + t.y }; }
export function invertTransform(p: Point, t: Transform): Point { return { x: (p.x - t.x) / t.scale, y: (p.y - t.y) / t.scale }; }
export function bounds(regions: Rect[]): Rect {
  const x = Math.min(...regions.map(r => r.x)), y = Math.min(...regions.map(r => r.y));
  return { x, y, width: Math.max(...regions.map(r => r.x + r.width)) - x, height: Math.max(...regions.map(r => r.y + r.height)) - y };
}
export function fitCamera(p: Project): Transform {
  const scale = Math.min(p.output.width / p.source.width, p.output.height / p.source.height) * 0.92;
  return { scale, x: (p.output.width - p.source.width * scale) / 2, y: (p.output.height - p.source.height * scale) / 2 };
}
export function targetCamera(p: Project, b: Beat): Transform {
  const box = bounds(b.regions), base = fitCamera(p);
  const scale = Math.max(base.scale, Math.min(p.camera.maxScale, p.output.width * 0.78 / box.width, p.output.height * 0.55 / box.height));
  // Center the region but keep image edges in-frame wherever the source fills the viewport.
  const constrain = (v: number, extent: number, viewport: number) => extent >= viewport ? clamp(v, viewport - extent, 0) : (viewport - extent) / 2;
  return { scale, x: constrain(p.output.width / 2 - (box.x + box.width / 2) * scale, p.source.width * scale, p.output.width), y: constrain(p.output.height / 2 - (box.y + box.height / 2) * scale, p.source.height * scale, p.output.height) };
}
const mix = (a: Transform, b: Transform, t: number): Transform => ({ scale: a.scale + (b.scale - a.scale) * t, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export function cameraAt(p: Project, time: number): Transform {
  const base = fitCamera(p);
  if (!p.camera.enabled) return base;
  let current = base;
  // Evaluate previous motion at the next move's start to avoid jumps when moves overlap.
  let previous: { from: Transform; to: Transform; start: number } | undefined;
  for (const beat of p.beats) {
    const start = Math.max(0, beat.start - p.camera.moveDuration * 0.82);
    if (time < start) break;
    const from = previous ? mix(previous.from, previous.to, ease((start - previous.start) / p.camera.moveDuration, p.camera.easing)) : current;
    const to = targetCamera(p, beat);
    previous = { from, to, start };
    current = mix(from, to, ease((time - start) / p.camera.moveDuration, p.camera.easing));
  }
  return current;
}
export function strokeFor(region: Region, underline: boolean) {
  return region.stroke ?? { start: { x: region.x, y: region.y + region.height * (underline ? 0.95 : 0.5) }, end: { x: region.x + region.width, y: region.y + region.height * (underline ? 0.95 : 0.5) } };
}
export function regionProgress(beat: Beat, time: number): number[] {
  const lengths = beat.regions.map(r => { const s = strokeFor(r, beat.style.effect === 'underline'); return Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y); });
  const total = lengths.reduce((a, b) => a + b, 0);
  let remaining = clamp((time - beat.start) / beat.reveal) * total;
  return lengths.map(length => { const progress = ease(remaining / length, beat.style.easing); remaining -= length; return progress; });
}
export function evaluateFrame(p: Project, frame: number) {
  if (!Number.isSafeInteger(frame)) throw new Error("Frame must be a finite integer.");
  const time = clamp(frame, 0, Math.round(p.duration * p.output.fps) - 1) / p.output.fps;
  return { time, camera: cameraAt(p, time), beats: p.beats.map(beat => ({ beat, visible: time >= beat.start && (beat.persist || time < beat.start + beat.reveal + beat.hold), progress: regionProgress(beat, time) })) };
}
// Stateless deterministic hash: output does not depend on frame order or a mutable RNG.
export function noise(seed: number, index: number): number {
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13;
  return (x >>> 0) / 0xffffffff;
}
