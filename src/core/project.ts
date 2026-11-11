import { z } from 'zod';
import { backdropSchema } from '../render/backdrop';
import { templateSchema } from '../text/template';

const finite = z.number().finite();
const unit = finite.min(0).max(1);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const pointSchema = z.strictObject({ x: finite, y: finite });
export const rectSchema = z.strictObject({ x: finite.min(0), y: finite.min(0), width: finite.positive(), height: finite.positive() });
export const easingSchema = z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']);
export const styleSchema = z.strictObject({
  effect: z.enum(['marker', 'underline', 'spotlight', 'invert']).default('marker'),
  color: color.default('#FFE34D'), opacity: unit.default(0.55),
  blend: z.enum(['source-over', 'multiply', 'screen', 'overlay', 'difference', 'exclusion']).default('multiply'),
  dim: z.strictObject({ target: z.enum(['none', 'inside', 'outside']), amount: unit, color: color.optional() }).default({ target: 'none', amount: 0.45 }),
  tint: z.strictObject({ color, amount: unit }).default({ color: '#FFE34D', amount: 0 }),
  texture: z.enum(['solid', 'felt-tip', 'dry-marker']).default('solid'),
  textureStrength: unit.default(0.35), seed: z.number().int().min(0).max(0xffffffff).default(42),
  displacement: finite.min(0).max(0.2).default(0), // fraction of thickness
  radius: unit.default(0.15), // fraction of half-thickness
  thickness: finite.min(0.1).max(2).default(1),
  trimStart: unit.default(0), trimEnd: unit.default(1),
  reverse: z.boolean().default(false), easing: easingSchema.default('ease-in-out'),
}).superRefine((s, ctx) => {
  if (s.trimStart >= s.trimEnd) ctx.addIssue({ code: 'custom', message: 'Stroke trim start must precede its end.' });
});
export const regionSchema = rectSchema.extend({
  stroke: z.strictObject({ start: pointSchema, end: pointSchema }).optional(),
});
const beatSchema = z.strictObject({
  id: z.string().min(1), regions: z.array(regionSchema).min(1).max(32),
  start: finite.min(0), reveal: finite.positive(), hold: finite.min(0), persist: z.boolean().default(true),
  style: styleSchema,
});
export const projectSchema = z.strictObject({
  schemaVersion: z.literal(1), name: z.string().min(1).max(120),
  source: z.strictObject({ width: z.number().int().positive().max(15000), height: z.number().int().positive().max(15000) }),
  output: z.strictObject({
    width: z.number().int().min(64).max(3840), height: z.number().int().min(64).max(3840),
    fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60), z.literal(120)]),
    bitrate: z.number().int().min(1_000_000).max(50_000_000),
  }),
  duration: finite.min(2).max(20),
  camera: z.strictObject({ enabled: z.boolean(), moveDuration: finite.min(0.05).max(5), maxScale: finite.min(0.1).max(4), easing: easingSchema }),
  beats: z.array(beatSchema).min(1).max(16),
  screenshotDocument: backdropSchema.optional(),
  screenshotHighlights: z.boolean().default(false),
  textDocument: z.strictObject({text:z.string().min(1).max(12000), start:z.number().int().min(0), end:z.number().int().positive(),fontSize:finite.min(36).max(100),font:z.enum(['sans','serif']),template:templateSchema.optional()}).optional(),
}).superRefine((p, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  if(p.textDocument && (p.textDocument.start>=p.textDocument.end || p.textDocument.end>p.textDocument.text.length)) fail('Text selection is outside the document.');
  if (p.source.width * p.source.height > 25_000_000) fail('Source exceeds 25 megapixels. Crop or downscale it first.');
  if (p.output.width % 2 || p.output.height % 2) fail('H.264 dimensions must be even.');
  if (p.output.width * p.output.height > 3840 * 2160) fail('Output supports at most 4K UHD.');
  if (new Set(p.beats.map(b => b.id)).size !== p.beats.length) fail('Beat IDs must be unique.');
  let lastStart = -1;
  for (const b of p.beats) {
    if (b.start <= lastStart) fail('Beats must have strictly increasing start times.');
    lastStart = b.start;
    if (b.start + b.reveal + b.hold > p.duration + 1e-8) fail('Beat exceeds shot duration.');
    for (const r of b.regions) {
      if (r.x + r.width > p.source.width || r.y + r.height > p.source.height) fail('Selection is outside the source image.');
      if (r.stroke) {
        const { start, end } = r.stroke;
        if (Math.hypot(end.x - start.x, end.y - start.y) < 1) fail('Stroke endpoints must be at least one pixel apart.');
        for (const q of [start, end]) if (q.x < 0 || q.y < 0 || q.x > p.source.width || q.y > p.source.height) fail('Stroke endpoints must lie inside the source image.');
      }
    }
  }
});
export type Project = z.infer<typeof projectSchema>;
export type Style = z.infer<typeof styleSchema>;
export type Region = z.infer<typeof regionSchema>;
export type Rect = z.infer<typeof rectSchema>;
export type Point = z.infer<typeof pointSchema>;
export type Beat = Project['beats'][number];
export type Easing = z.infer<typeof easingSchema>;

export function parseProject(value: unknown): Project { return projectSchema.parse(value); }
export function referenceStyle(): Style {
  return styleSchema.parse({ effect: 'invert', opacity: 1, radius: 0, texture: 'solid',
    displacement: 0, dim: { target: 'outside', amount: 0.72, color: '#FFFFFF' } });
}
export function createProject(width: number, height: number): Project {
  return parseProject({
    schemaVersion: 1, name: 'Untitled shot', source: { width, height },
    output: { width: 1920, height: 1080, fps: 60, bitrate: 24_000_000 }, duration: 6,
    camera: { enabled: true, moveDuration: 0.85, maxScale: 2, easing: 'ease-in-out' },
    beats: [{ id: 'beat-1', regions: [{ x: width * 0.12, y: height * 0.42, width: width * 0.76, height: height * 0.06 }], start: 1.4, reveal: 0.9, hold: 3.7, persist: true, style: referenceStyle() }],
  });
}
export function withFps(project: Project, fps: Project['output']['fps']): Project {
  // Seconds are canonical; switching fps cannot shift beat timing or duration.
  return parseProject({ ...project, output: { ...project.output, fps } });
}
export function frameCount(project: Project): number { return Math.round(project.duration * project.output.fps); }
