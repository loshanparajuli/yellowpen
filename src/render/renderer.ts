import { drawScreenshot, screenshotRect } from './backdrop';
import type { Project, Region, Style } from '../core/project';
import { parseProject } from '../core/project';
import { evaluateFrame, noise, strokeFor } from '../core/timeline';

export type Surface = HTMLCanvasElement | OffscreenCanvas;
type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export function makeSurface(width: number, height: number): Surface {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas;
}
export function context(canvas: Surface): Context {
  const ctx = canvas.getContext('2d') as Context | null;
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  return ctx;
}
function clear(ctx: Context, width: number, height: number) {
  ctx.resetTransform(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, width, height);
}
function rectangles(ctx: Context, regions: Region[]) {
  ctx.beginPath(); for (const r of regions) ctx.rect(r.x, r.y, r.width, r.height); ctx.fill();
}
function strokeMask(ctx: Context, region: Region, style: Style, progress: number, index: number) {
  if (progress <= 0) return;
  const stroke = strokeFor(region, style.effect === 'underline');
  const dx = stroke.end.x - stroke.start.x, dy = stroke.end.y - stroke.start.y;
  const length = Math.hypot(dx, dy), thickness = region.height * style.thickness * (style.effect === 'underline' ? 0.12 : 1);
  const start = length * style.trimStart, end = length * style.trimEnd, span = end - start;
  const left = style.reverse ? end - span * progress : start;
  ctx.save(); ctx.translate(stroke.start.x, stroke.start.y); ctx.rotate(Math.atan2(dy, dx));
  ctx.beginPath(); ctx.rect(left, -thickness, span * progress, thickness * 2); ctx.clip();
  ctx.fillStyle = '#fff';
  if (style.displacement === 0) {
    ctx.beginPath(); ctx.roundRect(start, -thickness / 2, span, thickness, Math.min(thickness * style.radius / 2, span / 2)); ctx.fill();
  } else {
    const steps = Math.max(8, Math.ceil(span / 12));
    ctx.beginPath();
    for (let j = 0; j <= steps; j++) {
      const y = -thickness / 2 + (noise(style.seed + index, j) - 0.5) * thickness * style.displacement;
      if (!j) ctx.moveTo(start, y); else ctx.lineTo(start + span * j / steps, y);
    }
    for (let j = steps; j >= 0; j--) ctx.lineTo(start + span * j / steps, thickness / 2 + (noise(style.seed + index + 913, j) - 0.5) * thickness * style.displacement);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/** Owns a bounded set of output-sized surfaces. Source is borrowed; caller owns its lifetime. */
export class Renderer {
  private readonly project: Project;
  private readonly mask: Surface;
  private readonly layer: Surface;
  private readonly original: Surface;
  private disposed = false;
  private screenshotReady = false;
  constructor(project: Project, private readonly source: CanvasImageSource, readonly canvas: Surface) {
    this.project = parseProject(project);
    this.mask = makeSurface(project.screenshotDocument && !project.screenshotHighlights ? 1 : canvas.width, project.screenshotDocument && !project.screenshotHighlights ? 1 : canvas.height);
    this.layer = makeSurface(project.screenshotDocument && !project.screenshotHighlights ? 1 : canvas.width, project.screenshotDocument && !project.screenshotHighlights ? 1 : canvas.height);
    this.original = makeSurface(canvas.width, canvas.height);
  }
  render(frame: number) {
    if (this.disposed) throw new Error('Renderer is disposed.');
    const p = this.project, state = evaluateFrame(p, frame), { width, height } = this.canvas;
    const ctx = context(this.canvas), mask = context(this.mask), layer = context(this.layer), original = context(this.original);
    if(p.screenshotDocument){
      if(!this.screenshotReady){drawScreenshot(original,this.source,p.source.width,p.source.height,width,height,p.screenshotDocument);this.screenshotReady=true;}
      if(!p.screenshotHighlights){clear(ctx,width,height);ctx.drawImage(this.original,0,0);return;}
    }
    const r=p.screenshotDocument?screenshotRect(p.source.width,p.source.height,width,height,p.screenshotDocument.distance):undefined;
    const transform = (c: Context) => r ? c.setTransform(r.width/p.source.width,0,0,r.height/p.source.height,r.x,r.y) : c.setTransform(state.camera.scale * width / p.output.width, 0, 0, state.camera.scale * height / p.output.height, state.camera.x * width / p.output.width, state.camera.y * height / p.output.height);
    if(!p.screenshotDocument){clear(original, width, height); original.fillStyle = p.textDocument ? '#ffffff' : '#e9e7e1'; original.fillRect(0, 0, width, height);
    transform(original); original.drawImage(this.source, 0, 0, p.source.width, p.source.height); if(p.textDocument?.template?.logo){original.fillStyle='#fff';original.fillRect(0,0,320*p.source.width/1920,100*p.source.width/1920);} original.resetTransform();}
    clear(ctx, width, height); ctx.drawImage(this.original, 0, 0);
    // Source treatments precede all marker layers. Regions form a union, including overlaps.
    for (const { beat, visible } of state.beats) {
      if (!visible) continue;
      const amount = Math.min(1, (state.time - beat.start) / 0.2);
      clear(mask, width, height); transform(mask); mask.fillStyle = '#fff'; rectangles(mask, beat.regions); mask.resetTransform();
      if (beat.style.tint.amount > 0) {
        clear(layer, width, height); layer.drawImage(this.mask, 0, 0); layer.globalCompositeOperation = 'source-in'; layer.fillStyle = beat.style.tint.color; layer.fillRect(0, 0, width, height);
        ctx.globalAlpha = beat.style.tint.amount * amount; ctx.drawImage(this.layer, 0, 0); ctx.globalAlpha = 1;
      }
      if (beat.style.dim.target !== 'none') {
        clear(layer, width, height); layer.fillStyle = beat.style.dim.color ?? '#000000'; layer.fillRect(0, 0, width, height);
        layer.globalCompositeOperation = beat.style.dim.target === 'outside' ? 'destination-out' : 'destination-in'; layer.drawImage(this.mask, 0, 0);
        ctx.globalAlpha = beat.style.dim.amount * amount; ctx.drawImage(this.layer, 0, 0); ctx.globalAlpha = 1;
      }
    }
    for (const { beat, visible, progress } of state.beats) {
      if (!visible || beat.style.effect === 'spotlight') continue;
      clear(mask, width, height); transform(mask);
      beat.regions.forEach((region, index) => strokeMask(mask, region, beat.style, progress[index], index));
      // Texture is cut from the union mask once, so overlaps do not double-invert.
      if (beat.style.texture !== 'solid') {
        mask.globalCompositeOperation = 'destination-out';
        const density = beat.style.texture === 'dry-marker' ? 3 : 6;
        const extents = beat.regions.map(r => {
          const stroke = strokeFor(r, beat.style.effect === 'underline');
          const pad = r.height * beat.style.thickness;
          return { left: Math.min(stroke.start.x, stroke.end.x) - pad, right: Math.max(stroke.start.x, stroke.end.x) + pad, top: Math.min(stroke.start.y, stroke.end.y) - pad, bottom: Math.max(stroke.start.y, stroke.end.y) + pad };
        });
        const minX = Math.min(...extents.map(e => e.left)), maxX = Math.max(...extents.map(e => e.right));
        // Source-space lines remain stable under camera movement and seeking.
        const top = Math.max(0, Math.floor(Math.min(...extents.map(e => e.top)) / density) * density);
        const bottom = Math.min(p.source.height, Math.max(...extents.map(e => e.bottom)));
        for (let y = top; y < bottom; y += density) {
          const n = noise(beat.style.seed, y);
          mask.globalAlpha = n * beat.style.textureStrength;
          mask.fillRect(minX, y, maxX - minX, 0.6 + n * 1.2);
        }
      }
      mask.resetTransform(); mask.globalAlpha = 1; mask.globalCompositeOperation = 'source-over';
      clear(layer, width, height);
      if (beat.style.effect === 'invert') {
        layer.drawImage(this.original, 0, 0);
        layer.globalCompositeOperation = 'difference'; layer.fillStyle = '#fff'; layer.fillRect(0, 0, width, height);
        layer.globalCompositeOperation = 'destination-in'; layer.drawImage(this.mask, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        layer.drawImage(this.mask, 0, 0); layer.globalCompositeOperation = 'source-in'; layer.fillStyle = beat.style.color; layer.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = beat.style.blend;
      }
      ctx.globalAlpha = beat.style.opacity; ctx.drawImage(this.layer, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    const branding=p.textDocument?.template;
    if(branding){ctx.save();ctx.setTransform(width/1920,0,0,height/1080,0,0);ctx.fillStyle='#fff';
      if(branding.source){ctx.fillRect(0,1000,1920,80);ctx.fillStyle='#555';ctx.font='24px Arial';ctx.fillText(branding.source,48,1048,1824);}
      if(branding.logo){ctx.fillStyle='#fff';ctx.fillRect(32,24,336,116);ctx.drawImage(this.source,0,0,320*p.source.width/1920,100*p.source.width/1920,40,32,320,100);}
      else if(branding.website){ctx.fillStyle='#fff';ctx.fillRect(32,24,520,70);ctx.fillStyle='#222';ctx.font='bold 28px Arial';ctx.fillText(branding.website,48,70,480);}
      ctx.restore();}
    return state;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const s of [this.mask, this.layer, this.original]) { s.width = 1; s.height = 1; }
  }
}
