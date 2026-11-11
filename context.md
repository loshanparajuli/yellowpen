# YellowPen — LLM handoff context

Last updated: 2026-10-24, Asia/Kathmandu.

## Read this first

This is an existing local application, not a request to start a new project.
Repository/workspace path used during development:
`/Users/loshanparajuli/Documents/fromSilicon/projects/yellowPen`.

The current product is a **single-page white editor** that turns screenshot text
into a static-camera highlight video. The user explicitly rejected the earlier
marketing landing page, dark theme and automatic zoom. Do not reintroduce those
without a new request. The current export is fixed at **3840×2160, 60 FPS, six
seconds, H.264 MP4**. Do not expose resolution/FPS controls or silently downgrade.

Read `README.md` for run/deploy commands, `HOW_TO_USE.md` for the actual user flow,
and the source files below before changing behavior. `docs.md` and `docs.yaml`
contain historical research and successive plans; they are not a reliable statement
of current implementation where they conflict with this file or the code.

This file records context, not permanent authority. New user instructions override
past preferences. Inspect current tools, files and environment rather than assuming
that prior ports, sessions, credentials or permissions still exist.

## Product and accepted scope

The user makes documentary/explainer videos and wants to avoid repeatedly animating
screenshots by hand. References included Vox/Johnny Harris-style document emphasis:
white paper, pale surrounding text, a black selected sentence and a red drawing
underline. An earlier reference used white text on a black highlight band.

The accepted approach is OCR → editable reconstructed text → exact word selection
→ animation. Pixel-perfect preservation of the source screenshot is not the goal
of the current text workflow. The original source's images and typography are not
recreated. Screenshot-region rendering remains as legacy code.

Current features:

- Paste, file-picker and drag/drop PNG/JPEG import; manual text entry.
- Browser-local English OCR, explicit text review, line-break preservation.
- Select a phrase across wrapped lines, or select all.
- Underline, marker/highlighter, invert/black block and focus-only effects.
- Effect popup on hover or keyboard focus, using the current document/selection.
  It uses sample text before import and an initial excerpt if there is no selection.
- Classic, Juniorist and Nepali Comment presets; custom layout/ink settings.
- Optional fixed source credit and uploaded logo/media-name label.
- Local named templates, last-generated-project autosave, portable project files.
- 4K preview backing store, 4K/60 worker export, cancellation and capability probe.
- Static hosting, without native helper, account, database service or cloud OCR.

## Evolution and superseded decisions

1. Started as a screenshot animation engine with rectangle/line selection, camera
   motion, a lab UI, and 1080p60/optional120 output.
2. Added a Mac Swift/Apple Vision OCR helper and text reconstruction.
3. Added effect controls, templates and source/logo branding.
4. Built an Atomik-inspired marketing page and interactive demo. User rejected it.
5. Replaced it with a minimal dark editor; removed camera movement; switched text
   shots to fixed 4K60 and browser OCR for a hosted app.
6. Latest request: white mode, simple editor, detailed usage and LLM handoff files.

Website-logo lookup through Google favicons was removed from the primary UI because
it required a server endpoint. Uploaded logos and media-name text remain. The name
“Nepali Comment” denotes a visual preset, not Nepali-language OCR support.

## Technology

| Layer | Implementation |
| --- | --- |
| Application language | TypeScript; vanilla DOM, no React/Vue component framework |
| Styling | Plain CSS in `src/text-ui/style.css`; white/neutral interface |
| Bundler/dev server | Vite 8.3.4, ES modules |
| Type checking | TypeScript 7.0.2, strict, noEmit |
| Schema validation | Zod 4.6.7, strict objects |
| Drawing | Canvas 2D / OffscreenCanvas |
| Video | Mediabunny 1.61.6 with browser WebCodecs H.264 encoder |
| OCR | Tesseract.js 6.0.1, WASM, `@tesseract.js-data/eng` 1.0.0 |
| Portable files | fflate 0.8.3 ZIP |
| Storage | IndexedDB project autosave; localStorage named templates |
| Unit tests | Vitest 5.0.5 |
| Legacy test dependency | @playwright/test 1.64.1; old scripts target the retired UI |
| Build tooling | Node.js 22.12+ required; Node 26 used during development |
| Legacy native component | Swift using Apple Vision and ImageIO |

`package-lock.json` is present. Use `npm ci` for repeatable setup. No secrets or
external API keys are required by the current product.

## Architecture and abstractions

```text
PNG/JPEG or manual text
  → browser OCR worker (when image)
  → editable text + UTF-16 selection offsets
  → TextTemplate + TextDocument
  → deterministic text layout + line selection regions
  → high-resolution source PNG + validated Project
  ├─ Renderer → full preview / effect popup
  ├─ export worker → codec probe → Renderer per frame → Mediabunny → MP4
  └─ IndexedDB or portable .yellowpen ZIP
```

### Entry and UI: `src/text-ui/main.ts`

`index.html` loads this module. It creates the UI with a static HTML string and
wires DOM event handlers. OCR/user text is inserted through `textContent`/textarea
values, never interpolated as executable HTML. It owns text, selection start/end,
template, generated project/image, renderer, bitmap, revision counters and abort
controllers. Async revision checks prevent stale composition/OCR from replacing
newer edits. Keep bitmap/renderer/worker disposal intact when refactoring.

The source-selection area is HTML text. The actual preview is Canvas. It is not a
WYSIWYG layout editor: source text wraps differently from the exported layout, but
UTF-16 offsets map the chosen words to their rendered positions. Changing settings
requires rebuilding with Animate selection. Preview and export are snapshots.

The module is relatively large and compactly formatted. A useful future refactor
would separate import state, template controls, preview controller and project
persistence without changing observable behavior.

### Text data: `src/text/template.ts`, `src/text/document.ts`

`TextTemplate` is a Zod-validated style/layout preset. It stores effect, color,
roughness, distortion, opacity, radius, dim, padding, width, spacing, font size,
font, source, website/media text and optional embedded PNG logo. A legacy `zoom`
field still exists for compatibility but is ignored by current text composition.

`TextDocument` stores text, UTF-16 selection offsets, font settings and optional
template. `composeText` validates input, lays it out in a 1920-unit coordinate
system, rasterizes at 2× resolution, scales all region/stroke coordinates, and
returns `{ project, image }`. It explicitly sets output to 3840×2160/60/50 Mbps,
duration comes from the six-second project factory, and camera.enabled=false.
It rejects oversized rasterized excerpts rather than reducing quality.

The logo is embedded in a reserved source-image patch. The renderer blanks that
patch in the moving source layer and copies it to a fixed output position; this
avoids asynchronous image decoding inside the synchronous renderer/worker loop.
Source credits/media names are drawn as output overlays. Preserve the source-scale
factor when touching this branding code.

### Layout: `src/text/layout.ts`

`layoutText` uses a supplied font measurement function to wrap text while retaining
original UTF-16 offsets. Blank lines are preserved; skipped wrapping whitespace
does not change offsets. `selectionRegions` intersects the selection with each
visible line and returns rectangles and precise underline endpoints. Non-underline
composition removes explicit underline paths so marker paths use region centers.
Maximum 100 layout lines and 32 selected rendered lines; raster limits can impose
a stricter practical bound for a 4K shot.

### OCR: `src/text/ocr.ts`, `src/text/contrast.ts`

`recognizeImage` validates/decode-checks the image, preprocesses faded ink, lazily
imports Tesseract.js, creates a worker, reports progress and returns recognized
text. It supports cancellation and a 120-second timeout, and terminates workers.
Engine, WASM and language paths are relative to the deployed document base URL.
No `/api/ocr` request is used by the current app.

`recoverFadedInk` detects predominantly near-white documents and thresholds their
ink to recover low-contrast grey text. Dark/photographic images are left unchanged.
This fixed heuristic was added after the reference screenshot's grey text was
missed. It is not general document segmentation and deserves broader fixture tests.

`scripts/prepare-ocr.mjs` copies worker/core/model assets and engine licenses from
node_modules into generated `public/ocr`. `predev` and `prebuild` run it. Vite copies
these to `dist/ocr`. Generated assets are ignored; never omit them from deployment.
The generated OCR asset directory was approximately 25 MB during testing; only the
chosen core is loaded at runtime. Keep OCR lazy so initial editor loading stays small.

### Core model: `src/core/project.ts`

Strict Zod `Project` schema, version 1. It validates dimensions, source pixel limits,
region bounds, timing, stroke endpoints, output parity and unique beat IDs. Schema
supports output up to 3840×2160 pixel area. Optional `textDocument` retains text and
template metadata; it preserves backward compatibility with older project files.

Important distinction: the **generic** `createProject` factory still has legacy
1080p60 defaults and camera settings used by lab/core tests. The current product's
`composeText` overrides them with 4K60 and a disabled camera. Do not conclude the UI
exports 1080p just by reading the factory. Changing generic defaults requires
reviewing lab behavior and tests too.

### Timeline: `src/core/timeline.ts`

Pure frame/time evaluation, camera transforms, deterministic seeded noise and
length-weighted multiline reveal progress. Seconds are canonical; frame rate does
not shift timing. Disabled camera returns a fixed fit for every frame. Generic
camera animation code remains for old projects, but the main editor does not enable
it. Default beat starts at 1.4 s, reveals over 0.9 s and holds to the six-second end.

### Renderer: `src/render/renderer.ts`

`Renderer` snapshots a validated project and borrows a CanvasImageSource. It owns
scratch surfaces for the source frame, masks and effect layers. `render(frame)` is
deterministic and supports seeking. It applies source dim/tint, marker texture,
blend/inversion, and fixed branding. `dispose()` releases scratch dimensions; the
caller closes its bitmap. Full preview, popup and export use this renderer, with
output-to-canvas scaling for smaller popup canvases.

### Export: `src/export/{client,worker,mp4}.ts`

`exportInWorker` validates/snapshots inputs and creates a fresh worker per job.
The worker decodes the source blob. `checkCapability` checks WebCodecs support;
`probeExport` really encodes three frames and decodes one before the full export.
Full frames are rendered sequentially with encoder backpressure, then muxed using
Mediabunny. Cancellation tears down the encoder/worker, including a timeout for
stalled workers. Never silently fall back to lower resolution/FPS.

### Persistence: `src/storage/{image,project-store}.ts`

`.yellowpen` is a ZIP containing `project.json` and one source PNG/JPEG. Unpacking
bounds decompressed sizes, validates the project and checks source dimensions.
For the text editor, the stored PNG is the **generated text template**, not the
original uploaded screenshot. Editable text is in the manifest.

IndexedDB database `yellowpen`, store `projects`, key `current` stores the latest
generated shot. `localStorage` key `yellowpen-templates` stores up to 30 validated
named templates. Both are origin-specific. Autosave occurs after composition;
uncommitted textarea edits are not guaranteed to persist. Portable files are the
reliable backup and transfer mechanism.

## Current UX rules

- Open directly into the editor. No hero, marketing gallery, decorative light
  trails, animated background, forced tutorial or account flow.
- Viewport-height shell; only document/settings panels scroll. Header contains the combined Export / 4K / 60 FPS button, disabled until a current preview exists. No header tagline.
- White default theme; neutral borders, readable secondary text, dark primary
  buttons and selected effect buttons. Effect colors inside the output remain.
- Keep advanced settings under Custom. Preserve focus rings and reduced-motion
  behavior; mobile uses a stacked layout below 800px.
- No auto-zoom, dimension selector, FPS selector or silent export fallback.
- Hover examples must use the same document/settings/renderer as the resulting
  effect, not disconnected mock illustrations. Keyboard focus should work too.
- OCR review is explicit. Do not imply OCR is infallible or source logos verify facts.

## Tooling, MCP and environment

Tools used during development were agent-side tools, not application dependencies:

- `functions.exec` orchestrated `exec_command`, file edits, builds and unit tests.
- `mcp__cua_repl` inspected and operated the in-app browser: uploads, paste, selection,
  popup interaction, screenshots and downloads. Read its current documentation
  before using it; bindings/session IDs may be stale. Follow the active browser
  policy instead of assuming shell Playwright is allowed for browser interaction.
- `web__run` researched official Apple Vision/Tesseract documentation and inspected
  visual references. The production app does not call this tool.
- `ffprobe` independently inspected an exported MP4 from the filesystem.
- Codex file/artifact/UI tools may be available, but no MCP server is required to
  run YellowPen. There are no runtime MCP calls, connector accounts or API secrets.

Filesystem/network restrictions sometimes required tool-level approval for npm
installs, native Apple Vision execution and binding a localhost server. These are
environment permissions, not permission dialogs to implement in the product.
No subagents were used for the latest release. Do not infer permission to message
other chats or deploy publicly from this record. Prior native/browser tool sessions
may have ended. The workspace was not a Git repository when checked earlier;
inspect current Git state before assuming commits, branches or remotes exist.

## Development and verification

```sh
npm ci
npm run dev       # prepares browser OCR assets, then localhost Vite
npm run check     # Vitest + TypeScript + production Vite build
npm run preview   # serves existing dist, does not rebuild it
```

If a production-preview tab appears stale after an edit, rebuild and reload it.
A dev tab gets HMR. Previously used ports were 5174 and 4173; use actual server
output. Neither is a deployed public site.

31 unit tests covered schema/timing, selection geometry, repeated phrases, Unicode
offsets, template constraints, 4K pixel limits, static camera and faded-ink handling
at the last release. Legacy `scripts/browser-test.mjs` and
`scripts/production-test.mjs` target the retired lab UI; they are not registered
as current package scripts and should not be cited as release tests.

Observed production-browser checks from the preceding implementation:

- Real screenshot upload and clipboard paste using bundled browser OCR.
- Initial faded-text failure, preprocessing fix, successful repeat recognition.
- Manual review, exact phrase selection, rendered preview at 3840×2160.
- Successful six-second video download, independently checked by ffprobe:
  3840×2160, r_frame_rate=60/1, avg_frame_rate=60/1, 360 frames, 6.000000 seconds.
- Keyboard effect popup using uploaded text; fixed scroll-triggered dismissal.
- Empty-input validation and immediate OCR cancellation.
- No console errors observed in those tested flows.

Artifacts may exist under ignored `artifacts/`, including `verified-4k60.mp4`,
`release-check.md` and screenshots. They are evidence from a particular environment,
not proof of cross-browser compatibility. Current white-theme work changes CSS
only, plus documentation; it does not change the encoded video appearance.

## Known limits and next work

Not publicly deployed. No cross-browser/device certification. Browser/H.264 support,
4K memory pressure and first OCR model download are material launch constraints.
English OCR only. The reference's AI/Al confusion remains a manual-review example.
Fixed-threshold preprocessing may struggle with colored/noisy/complex documents.
Very long documents become small in a static frame or exceed raster limits.
No full timeline, multiple-shot sequencing, audio, PDF import, server encoder,
accounts, cloud sync, collaboration or billing. Logos are uploaded, not fetched.

Suggested next work, not completed promises:

1. Test the actual HTTPS deployment with OCR assets present and cache/MIME handling.
2. Verify target browsers/devices, export cancellation, memory use, and larger files.
3. Replace legacy browser scripts with current-editor regression coverage.
4. Broaden OCR fixtures (faint ink, columns, colored backgrounds, rotation).
5. Refactor UI state and handlers into modules while preserving export snapshots.
6. Add additional OCR languages only if requested, accounting for model download size.

Preserve the current simple UX. Launch planning is not authorization to claim the
site is live or to deploy to an unspecified account/provider.

## Branding and discovery update — 2026-10-24

The editor remains the homepage. Lowercase title: `image text highlighter & animation | yellowpen`. The earlier asterisk/wordmark is restored with a yellow SVG favicon. Footer links to From Silicon and the public usage guide.

New entry `src/entry.ts` loads only the small shell on screens below 768px; the editor dynamically loads when the viewport reaches tablet width. `src/shell.css` owns the phone notice and footer. Resizing smaller hides an already loaded editor without destroying work. This is a viewport guard, not user-agent detection; browser encoder support still determines export compatibility.

`scripts/seo.mjs` Vite plugin serves/emits robots, sitemap, guide.html, guide.md, llms.txt and the singular llm.txt alias. It transforms the canonical/OG/JSON-LD origin in index.html. `SITE_URL` is an optional HTTPS-origin environment variable; default provisional origin is https://yellowpen.fromsilicon.com. No deployment or domain registration performed. SEO_RESEARCH.md documents qualitative search-intent evidence and launch checks. No keyword volumes or ranking guarantees. Public guide describes local OCR, reconstructed text, fixed 4K60 output and WebCodecs limitations. Internal context/blueprint files are not public assets.

Text controls: expanded Text & spacing panel exposes font size, side padding, top/bottom margin, text width and line spacing. Typeface remains above templates. verticalPadding defaults to 160 for old projects/templates, and is applied in layoutText to both baselines and document height. The selectable DOM view scales these layout values to panel width via ResizeObserver. Changes invalidate the old export until Animate selection is used.

## Export stall fix — 2026-11-10

Replaced CanvasSource's implicit encoder queue backpressure with direct WebCodecs VideoEncoder feeding Mediabunny EncodedVideoPacketSource. Quality-mode H.264 is explicitly flushed every four frames, with a keyframe after each flush; 4K60 and bitrate remain unchanged. Frame surfaces close immediately, muxer writes are awaited, and output frame count must match input count. The real encode/decode probe now spans 12 frames (three batches). This removes the unbounded dequeue wait observed in the previous dependency path; the original user's exact screenshot project was not available in the current tab for reproduction.

The client has a 45-second no-progress watchdog covering decoding, probing, rendering and finalization, terminating a stuck worker and returning a retryable error. Progress renews the timeout. Cancellation retains the 1.5-second forced-termination fallback. Preview playback stops while exporting to reduce concurrent GPU work. Finalization has distinct status text.

Validation: browser export after a text-size edit succeeded; ffprobe decoded all 360 frames at 3840×2160, 60/1 FPS and 6 seconds. Tests cover stuck worker termination/retry, continued progress past timeout duration, and unresponsive-worker cancellation. Frequent keyframes trade compression efficiency for bounded, reliable encoding; output remains at configured bitrate.

## Timing and lightweight hover previews

Template fields videoDuration (2–20s, default6) and highlightDuration (.2–18s, default.9) persist in projects/custom templates. src/text/timing.ts fits the draw and lead-in into the video, leaving .1s of completed highlight. UI caps draw duration when shortening the video. composeText applies these timings to project duration/start/reveal/hold; preview uses rounded integer frame counts for fractional durations. Hover demos follow actual draw timing.

composeText's previewOnly flag rasterizes hover-demo text at .5× rather than 2× (16 times fewer source pixels); normal preview and export retain the full source. No dependencies added. Measured production main JS ~44.7KB gzip, entry ~1.3KB gzip and CSS ~3.1KB gzip; OCR JS/models/wasm load only on image recognition, export worker only on export. OCR assets occupy ~24MB on disk across engine variants, not an initial-page download. Export uses bounded four-frame encoding batches but the resulting MP4 is buffered in memory; longer 4K exports still cost more memory and time. Do not claim the entire OCR/export workload is lightweight on every device.

Live preview update: once an animation preview is open, typography, spacing, timing, effects, source/logo and template changes rebuild it automatically. requestPreview coalesces inputs for 100ms and allows only one compose at a time; revision guards discard stale builds and close unused bitmaps. Layout tweaks show the completed highlight rather than replaying on every input. Replay remains available. Export/save are disabled while refreshing to avoid stale settings. Returning to text selection invalidates queued renders. The selectable text view continues updating immediately before the first animation.

Settings simplification: default sidebar shows import/edit, Style preset, four effects and Timing (Video length / Draw time). Font and layout sliders live in collapsed Text & layout; effect/source/logo/template-save settings in collapsed More options. Redundant output specification hidden because header export already shows 4K60. All existing control IDs and live-update behavior retained.

## Clipboard and original screenshot mode

Paste screenshot uses navigator.clipboard.read from a user click, with explicit missing-image/permission fallback to keyboard paste or drop. All image inputs route to offerImage: validated PNG/JPEG, thumbnail, dialog choosing use-as-is vs OCR. Object URLs revoked on close. Original mode stores the original Blob plus dimensions, not a flattened composition.

Project schema has optional screenshotDocument (backdropSchema from src/render/backdrop.ts). This mode currently produces a static screenshot composition video, no manual screenshot-region annotation UI. Renderer detects it, caches the backdrop/composition once, and bypasses text highlights. Unused mask/layer surfaces are 1×1. Options: five local gradient palettes, blurred source image, custom color, distance, blur, corner radius, shadow. No network assets/dependencies. Live preview scheduler reused; .yellowpen save/open and IndexedDB restore preserve original image + settings. OCR still loads only when selected. Existing text-project behavior retained.
