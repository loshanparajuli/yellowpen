# YellowPen: screenshot-to-video documentary animation

Research and proposed build specification • 19 October 2026

Revision 2: expanded highlight controls and high-frame-rate export. Structured requirements: `docs.yaml`.

Status: core engine MVP implemented on 20 October 2026. See `README.md` for runnable scope and validation; this blueprint also contains features that remain planned.

## 1. Recommendation

Build a small, local-processing web app that turns a document screenshot into a polished, short video insert:

**Paste screenshot → mark the important lines → choose a look → preview → export MP4.**

The app should handle framing, camera movement, marker animation, background dimming, and reading time automatically. The user should control what matters and when it appears, without positioning keyframes. Export the complete shot for use in the user's existing video editor.

Start with React, TypeScript, Canvas 2D, and WebCodecs through Mediabunny. Keep composition and rendering separate from the interface so the same engine can later power an Electron Mac app. Avoid a general video editor, accounts, cloud rendering, and generative AI in the first release.

There is a credible existing alternative: **Headroom Source Highlight**. Its official page advertises screenshot input, line selection, camera movement, several annotation gestures, and browser-local MP4 export. Try it against real editing tasks before spending weeks building. Custom development makes sense if repeatable personal presets, multiple sequential highlights, reliable project saving, batch work, or precise narration timing materially improve the workflow. These are proposed differentiators, not claims that the competitor lacks every one of them. [Source Highlight](https://headroomapp.ai/tools/source-highlight)

Estimated effort for one experienced frontend/media developer: **3–5 working days for a feasibility spike, 5–8 weeks total for the expanded personal-use MVP, and 9–14 weeks total for a polished browser release**. These are engineering estimates, not measured promises. Codec compatibility and visual polish are the largest uncertainties.

## 2. The actual job

Today, each insert repeats the same work: import a screenshot into an editor, frame it, create masks or shapes, animate the highlight, animate the camera, adjust timing, and export or nest the shot. A tool should preserve editorial judgment while removing that repetition.

The core unit is a **shot**: one source image, one or more ordered emphasis regions, a camera path, and a duration. A shot is typically 4–12 seconds, with a configurable 2–20 second range for the MVP.

Example: paste a report page, drag across a two-line claim, select Yellow Marker, and receive a six-second clip. The page appears, the camera moves toward the claim, each line receives a marker stroke, and the image stays still long enough to read. The user drops the MP4 under narration in Final Cut, Resolve, Premiere, or another editor.

Success means a usable insert in under one minute of hands-on work for a straightforward screenshot. This is a product target to validate, not an observed result.

### Working assumptions

- Primary user: an occasional video editor working on a Mac.
- Input: PNG/JPEG screenshots, usually articles, reports, emails, tables, or scanned pages.
- Output: a full-frame, silent video insert; narration and sound design remain in the main editor.
- First environment: current Chrome on Apple Silicon macOS. Safari support needs a separate export test.
- Default: 16:9, 1920×1080, 60 fps, six seconds. Offer 120 fps when the exact export configuration passes a device probe; allow supported export settings to become the user default. Keep 24/25/30 fps as explicit alternatives.
- No reference clips or timestamps were supplied. The style specification below is a design interpretation of the requested documentary aesthetic, not a measured shot-by-shot analysis of Vox, Johnny Harris, or Netflix productions. Netflix has no single documentary house style.

## 3. Existing options and whether to use them

Capabilities in this table come from official product/documentation pages. Products have not been installed or export-tested during this research. Workflow fit is an assessment.

| Option | What is verified | Fit for this task | Decision |
|---|---|---|---|
| Headroom Source Highlight, web | Screenshot/paste input, line targeting, annotation gestures, framing controls, aspect ratios, MP4 and PNG output advertised | Closest ready-made workflow | First tool to trial with five real screenshots |
| Apple Motion + Final Cut Pro | Motion can publish reusable effects, titles, transitions, and generators into Final Cut | Strong if all editing already happens in Final Cut; a custom template can expose useful controls | Shortest custom solution for a Final Cut-only workflow |
| After Effects template + Premiere | Reusable MOGRTs expose selected properties for editors | Good for an existing Adobe workflow; initial authoring still needs motion design | Prefer if editing is already Premiere-centric |
| MotionVFX mDocumentary | Documentary effects, camera movements, overlays, and emphasis tools; versions advertised for Final Cut and Resolve | Useful broader visual toolkit; exact screenshot-highlighter workflow must be trialled | Consider purchasing before recreating a broad effect library |
| Screen Studio | Editing zooms focus areas of screen recordings | Useful for recorded demonstrations; less directly aligned with standalone document inserts | Adjacent option, not the primary recommendation |
| Custom YellowPen | Proposed screenshot-specific editor | Best control over repeated personal workflow and output | Build a small slice, then compare it with the closest existing tool |

Sources: [Headroom](https://headroomapp.ai/tools/source-highlight), [Apple Motion overview](https://www.apple.com/final-cut-pro/), [Motion templates in Final Cut](https://support.apple.com/en-lamr/guide/final-cut-pro/ver927a7da60/mac), [Adobe MOGRT workflow](https://experienceleague.adobe.com/en/docs/creative-cloud-enterprise-learn/cce-learning-hub/videooverview/videotutorials/motion-graphics-templates), [MotionVFX](https://www.motionvfx.com/collections/mdocumentary), [Resolve edition](https://www.motionvfx.com/store%2Cmdocumentary-dvr%2Cp3969.html), [Screen Studio editing zooms](https://preview.screen.studio/guide/adding-editing-zooms).

### Buy-versus-build experiment

Use five representative screenshots: a clean article, a two-column report, a dark-mode post, a scanned page, and a table. Attempt the same six-second shot in the nearest existing tool and record hands-on time, output readability, timing control, export compatibility, and whether revisions are easy. Build if recurring friction is substantial. A custom app is not automatically the cheapest way to solve an occasional editing task.

## 4. Translate the visual references into concrete behavior

The requested look comes from a coordinated sequence, not merely a yellow rectangle. Treat these as original presets inspired by common documentary techniques, without implying affiliation or exact reproduction of any publisher's work.

| Technique | Purpose | Implementation | Priority |
|---|---|---|---|
| Establish the source | Show where the evidence came from | Initial wide framing or header/context crop | MVP |
| Controlled push-in | Direct attention toward a claim | Animate translation and uniform scale with easing | MVP |
| Marker reveal | Make the selected words unmistakable | Progressively reveal a textured band per line | MVP |
| Spotlight | Reduce competition from surrounding text | Dim the image outside selected regions | MVP |
| Underline | Provide lighter emphasis | Animate a line below the selected text | MVP |
| Extracted quote strip | Lift a small original excerpt from the page | Duplicate the source crop onto a card with shadow | Next release |
| Circle or rough box | Mark a date, figure, or phrase | Reveal a seeded path by path length | Next release |
| Paper texture and subtle skew | Add archival character | Reusable texture and restrained rotation | Later polish |
| Grain, vignette, sound accents | Support atmosphere | Optional finishing layers; separate sound workflow initially | Later |

### Suggested six-second shot

| Time | Behavior |
|---|---|
| 0.00–0.70 s | Show source context, stationary |
| 0.70–1.55 s | Ease into the selected passage |
| 1.40–2.30 s | Marker sweeps across selected lines in order |
| 2.30–5.50 s | Hold the readable result |
| 5.50–6.00 s | Continue holding to provide an editing handle |

These timings are proposed defaults. Let the user adjust highlight start and reading hold directly. Do not force an exit animation: a stable end is often easier to cut.

### Presets

1. **Yellow Marker:** white or light document, warm translucent marker, restrained push-in, minimal background treatment.
2. **Spotlight:** context first, surrounding page darkens, chosen passage stays readable; no oversized camera move.
3. **Clean Underline:** little or no zoom, thin animated line, suitable for dense reports and tables.
4. **Evidence Card, later:** original screenshot crop lifts onto a neutral background while the source remains visible behind it.

### What makes it look good

- Preserve words and punctuation as source pixels. OCR may assist selection but must not replace the evidence with guessed text.
- Keep enough surrounding material to establish meaning. A source label is optional and user-entered.
- Show a multiline sentence with separate bands, not one giant box over the paragraph and its whitespace.
- Hold the finished shot longer than the camera move. Start with a reading-time suggestion of `max(2, wordCount / 3)` seconds when word count is available, and let the user override it. This is a heuristic.
- Use stable, seeded marker irregularity. Randomizing its outline every frame creates flicker.
- Default to smooth monotonic easing rather than a bouncy spring for text.
- Preserve text contrast. Multiply blending works well on light pages; dark pages need a different color/opacity treatment or underline/spotlight.
- Warn when enlargement will make source text visibly soft. Bigger output dimensions cannot restore missing screenshot detail.
- Avoid persistent drift while reading. Motion blur is optional and should never blur the settled text.

## 5. Product interaction

### Main screen

A large central canvas shows the shot. A compact inspector provides look, marker color, camera framing, and duration. A bottom strip shows ordered emphasis beats and a playback scrubber. Start with three conceptual actions: **Import, Mark, Export**.

1. Drag in a PNG/JPEG, choose a file, or paste an image with Cmd+V.
2. Fit the source to the canvas and immediately allow manual selection.
3. Drag a rectangle over the relevant line. Add another rectangle for a wrapped line; group them into one beat.
4. Preview the default shot automatically. Drag handles to refine selection.
5. Select a preset, adjust framing, or move the highlight's start time.
6. Export the finished shot with progress and cancellation.

A second beat should be an explicit “Add next highlight” action. The camera moves between beats only when needed. By default, earlier marker strokes persist; make persistence editable.

### Required controls

- Undo/redo for all edits, delete selection, duplicate beat, reorder beats.
- One-click reset framing and reset look.
- Space to play/pause; arrow keys to step frames; editable numeric timing.
- Separate **editor pan/zoom** from the **camera movement in the exported video**.
- Numeric region fields and keyboard movement as alternatives to precise dragging.
- Selection boundaries and labels that remain visible independently of marker color.
- A full-resolution settled-frame preview for checking actual readability.

### Save behavior

Autosave project state and image blobs locally in IndexedDB. Browser storage can be cleared or evicted, so offer a portable project download containing a versioned JSON manifest and original assets. A saved JSON file alone is insufficient if its image references are temporary blob URLs.

### Deliberately outside the MVP

Video import, audio editing, transcript alignment, arbitrary keyframes, multitrack compositing, collaboration, accounts, payments, URL scraping, direct PDF import, generative effects, and transparent video export. A screenshot taken from a PDF works without requiring a PDF parser.

## 6. Architecture options

| Architecture | Benefits | Costs / risks | Recommendation |
|---|---|---|---|
| Browser + Canvas + WebCodecs | Fast launch, local processing, one codebase, simple hosting | Codec/device support and memory must be tested | Start here |
| Electron + shared web engine | Bundled Chromium, desktop file access, room for native encoding | Larger distribution, signing/updating, desktop security work | Add for desktop needs |
| Tauri + shared web engine | Native shell with system webview | macOS WKWebView differs from Chromium; wrapper does not solve codec issues | Consider only with a tested native export path |
| SwiftUI + Core Graphics/Metal + AVFoundation | Strong Mac integration and native media pipeline | More platform-specific code; little web UI reuse | Choose if Mac-only quality becomes the defining requirement |
| React + Remotion + local/server rendering | Established frame-based composition and video rendering | Server/local runtime complexity and license considerations | Good alternate path for richer template work |

Tauri explicitly uses the macOS system webview. Electron's guidance requires careful isolation of renderer and privileged capabilities. Apple provides native image text recognition and movie-writing APIs. [Tauri webviews](https://v2.tauri.app/reference/webview-versions/), [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [Apple Vision](https://developer.apple.com/documentation/vision/recognizing-text-in-images), [AVAssetWriter](https://developer.apple.com/documentation/avfoundation/avassetwriter).

### Proposed first stack

| Layer | Choice | Reason |
|---|---|---|
| UI | React + TypeScript + Vite | Straightforward interactive editor |
| State | Small typed store, e.g. Zustand, with undoable commands | Easy separation between persisted document and temporary UI |
| Rendering | Canvas 2D, pure frame evaluation | Enough for image transforms, masks, strokes, and simple shadows |
| Geometry | Own small module with affine transforms | Avoid storing selection coordinates in screen space |
| Export | Mediabunny + WebCodecs | Encode generated frames and mux an MP4 |
| Persistence | IndexedDB + downloadable project bundle | Local recovery and portable backups |
| Text assistance | Optional local line detection, then Tesseract.js worker | Manual tool remains usable immediately |
| Tests | Unit tests for geometry/timing; integration and visual fixtures | Focus on failure-prone behavior |

This stack choice is an engineering judgment. Canvas 2D should be benchmarked with the intended effects before adding WebGL/PixiJS. We do not need a second graphics engine merely to draw a few rectangles.

### Module boundary

```text
Editor UI ──commands──> versioned project + undo history
                              │
                     evaluateFrame(project, frame)
                              │
                     renderFrame(canvas, state, assets)
                         /                     \
               interactive preview       export loop
                                         encode → mux → MP4
```

Use the same frame evaluator and renderer for preview and export. DOM/CSS can provide controls and selection handles, but exported visuals should come from the shared compositor. This avoids a beautiful preview that cannot be reproduced in the downloaded file.

## 7. Rendering and geometry specification

### Coordinate systems

Store selections in intrinsic image pixels after orientation normalization. Keep explicit transforms for image-to-output, output-to-preview, and preview-to-screen. Pointer selection applies the inverse combined transform. Device pixel ratio affects canvas backing resolution, not saved selection coordinates.

For a nonrotated image, a camera maps source point `p` to output point `q` using `q = scale * p + translation`. A selection bounding box with width `bw`, height `bh`, output `W × H`, and output-space margin `m` has a starting target scale:

```text
scaleFit = min((W - 2*m) / bw, (H - 2*m) / bh)
translation = outputCenter - scaleFit * selectionCenter
```

Constrain that result with source sharpness, desired context, page-edge handling, and available output space. A one-word selection must not trigger an extreme zoom. If preserving a context region makes the text too small, offer a tighter crop or separate beat. For vertical output, a long horizontal sentence may require multiple crops or a later evidence-card layout; do not silently cut off words.

### Marker

Precompute one slightly irregular polygon per line using a stable seed. Animate a reveal mask over it, composited in image coordinates so the marker follows camera movement. For multiple lines, reveal sequentially with approximately constant drawing speed; distribute time by line length with a small pause between lines.

Expose band padding and thickness in advanced controls. Support left-to-right initially with a direction override; manual regions should also work for right-to-left text. Do not claim robust automatic reading order across all writing systems before testing.

### Spotlight and extracted strips

Spotlight: render the source, render a dim layer with holes for the selected rectangles, then annotations. Use an offscreen mask so a compositing operation does not erase the source itself.

Evidence card, later: copy the original selected pixels to a separate card. Do not generatively reconstruct a hidden page or retype the excerpt. A rectangular crop is simpler and more faithful than automatic text cutout.

### Determinism

All animation depends on frame index and project settings. No wall-clock animation, unseeded randomness, or accumulated transforms. Scrubbing to frame 75 must produce the same composition as exporting frame 75. Encoded files need not be byte-identical across encoders; the rendered composition should be stable.

## 8. Export: validate this before building the full UI

WebCodecs provides frame encoding; it does not by itself produce a finished MP4 file. Mediabunny provides container writing and integration with encoding sources. Check the actual codec configuration on the user's device, rather than inferring support from the browser name. [WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API), [codec selection](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Codec_selection), [Mediabunny format support](https://mediabunny.dev/guide/supported-formats-and-codecs).

### MVP contract

- MP4 container, H.264/AVC video, opaque background, no audio track.
- Explicit aspect-ratio selector: 16:9 by default (1920×1080), with 9:16 and 1:1 alternatives. Source dimensions must not silently override the chosen ratio.
- Integer 24/25/30/60 fps, default 60; 120 fps is an advanced, capability-gated option. Save a supported higher rate as the user default when requested. Never silently downgrade. Fractional broadcast rates can follow with rational time handling.
- Suggested starting bitrate: 20–35 Mb/s at 1080p60, tuned against small text. This is a test range, not a guaranteed optimum.
- Consistent standard dynamic range output; test screenshot color profiles and white/black levels in both browser and target editor.
- Progress, cancel, meaningful errors, and safe retry after failure.

### Export loop

Snapshot the project so edits cannot change an active export. Decode assets and complete resource loading first. Compute `N = round(durationSeconds * fps)` and expose the resulting duration `N / fps`.

For frames `i = 0…N-1`, evaluate at `i / fps`, draw the frame, and submit it with timestamp `i / fps` and duration `1 / fps`. Await backpressure and finalize the encoder/muxer before offering the file. Close frame resources and free buffers on success, failure, or cancellation. Use a worker where supported and beneficial; keep a chunked main-thread implementation as a simpler fallback.

Mediabunny documents canvas sources, finalization, cancellation, and memory versus streaming targets. Use a bounded buffer for short clips; do not concatenate arbitrary streaming chunks without respecting their positions. [Writing media files](https://mediabunny.dev/guide/writing-media-files)

Do not use screen recording or `requestAnimationFrame` timing as the authoritative export clock. A busy or backgrounded tab could otherwise change the output. Background suspension may pause the export job; it must not alter the video timestamps.

### Memory and performance

A 1920×1080 RGBA frame is about 7.9 MiB. Keeping 360 raw frames (six seconds at 60 fps) would cost about 2.78 GiB before encoder and source overhead. A 4K frame is about 31.6 MiB. Stream frames through a bounded queue; never accumulate the whole raw movie.

Proposed input ceiling: 25 megapixels and 15,000 pixels on either axis, with a downscale/crop option for larger images. These are starting guardrails to tune on the baseline Mac. Keep export imagery at full usable resolution while allowing a smaller preview proxy.

### Fallback policy

If the exact H.264 configuration is unsupported or fails a short encode probe, preserve the project and explain the supported route. Initially recommend the tested browser; later offer a local desktop exporter. Never rename WebM as MP4 or silently upload a private screenshot to a server.

Avoid ffmpeg.wasm as the default export path. Its own documentation notes performance limitations relative to native FFmpeg and a 2 GB input limit in the documented implementation. Native FFmpeg can be a desktop alternative, but adds packaging and distribution considerations. [ffmpeg.wasm FAQ](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/apps/website/docs/faq.md)

### Editing formats later

ProRes MOV can be valuable for editing intermediates. Alpha-capable output needs its own encoding and interoperability work; normal H.264 MP4 is not the transparency solution. A PNG sequence is a possible advanced fallback but creates many files. Validate the exact format with the user's editor before promising compatibility.

## 9. Automatic selection without unnecessary AI

Three progressively more complex options:

1. **Manual rectangles:** reliable, immediate, language-independent. This is mandatory even if automation is added.
2. **Line geometry detection:** estimate text rows using contrast, connected components, and horizontal projections. This can enable click-a-line without recognizing its words. Columns, tables, dark mode, and skew complicate it.
3. **OCR word boxes:** optional local Tesseract.js worker for word selection, sentence grouping, and reading-time estimates. Cache results by image hash. Configure the pinned library version to return the needed structured boxes.

Tesseract.js supports browser and Node execution but does not directly support PDF input. Treat OCR as assistance; recognition errors cannot be allowed to change the source. [Tesseract.js](https://github.com/naptha/tesseract.js)

For a native Mac version, evaluate Vision text recognition. It needs a native bridge if the UI stays web-based. Neither OCR nor line detection can reliably decide which claim the editor intends to emphasize. An LLM is not required for this product's central job.

## 10. Proposed project model

```ts
// RegionStyle is specified by region_style in docs.yaml; this sketch omits its full type.
type Rect = { x: number; y: number; width: number; height: number };
type Beat = {
  id: string;
  regions: Rect[];             // ordered lines, intrinsic image pixels
  effect: 'marker' | 'underline' | 'spotlight' | 'dim' | 'tint';
  startFrame: number;
  revealFrames: number;
  holdFrames: number;
  persist: boolean;
  direction: 'ltr' | 'rtl';
  style: RegionStyle;          // extended properties defined in docs.yaml
  camera: {
    mode: 'auto' | 'manual';
    contextRect?: Rect;
    targetRect?: Rect;
  };
};
type Project = {
  schemaVersion: 1;
  id: string;
  source: {
    assetId: string;           // stable bundle/IndexedDB reference
    hash: string;
    width: number;
    height: number;
  };
  output: { width: number; height: number; fps: 24 | 25 | 30 | 60 | 120 };
  durationFrames: number;
  presetId: string;
  presetVersion: number;
  beats: Beat[];
  sourceLabel?: string;
};
```

This is a proposed schema, not a library API. Persist resolved style settings as well as a preset version so future preset changes do not silently alter existing projects. Validate bounds, finite numbers, timing, output size, and asset presence on load. Reject unsupported schema versions gracefully. Define whether a duration change shifts later beats or shortens holds; do not hide that decision in the renderer.

## 11. Complexity and delivery plan

Effort estimates assume a single experienced developer, feedback during development, no accounts/backend, and a narrow tested browser target. Ranges overlap; rows are not separate additive commitments.

| Milestone | Scope | Estimate | Completion gate |
|---|---|---|---|
| Export spike | One source, one rectangle, six-second animation, real MP4 | 3–5 days | Export opens and scrubs correctly in QuickTime and user's editor |
| Editor foundation | Import, region manipulation, coordinates, undo, preview | 4–7 days | Selections survive zoom, resize, and reopen |
| Motion system | Three looks, camera framing, multiline reveal, ordered beats | 5–8 days | Fixture shots are readable and visually consistent |
| Export and saving | Capability checks, cancellation, local saving, project bundle | 4–7 days | Failure/retry and recovery work without losing edits |
| Advanced styling | Textures, endpoints, displacement, dim/tint, blend modes, inversion | 8–12 days | Shared preview/export output passes effect fixtures |
| Personal MVP refinement | Usability, edge cases, actual editing feedback | 3–5 days | Ten real inserts completed with less repetitive work |
| Public-release hardening | Browser/device matrix, accessibility, more input cases | 4–6 additional weeks | Published support matrix and regression corpus pass |

A desktop wrapper can be a small prototype, but a distributable Mac app with signing, updates, safe native bridges, and a validated export pipeline is a further **2–5 weeks** of planning allowance. A native-only Swift implementation might take **6–12 weeks total** for comparable polish, depending heavily on developer experience. Re-estimate after the spike.

### Relative difficulty

- Basic marker animation: low.
- Reliable selection and transformed coordinate handling: medium.
- Automatic framing that consistently looks good: medium–high.
- Useful OCR selection across varied documents: medium–high.
- Exact-timing video export and editor interoperability: high.
- Rich multitrack editor, automatic narrative decisions, or general PDF understanding: very high and outside scope.

### Operating costs

A local-processing browser MVP needs static hosting and optionally a domain; it has no per-clip server rendering bill. Cost grows mainly with development/support and any later hosted rendering. Do not introduce cloud infrastructure before it solves a demonstrated limitation.

Remotion remains a reasonable alternative if template complexity grows. Its current pricing page lists free eligibility for individuals and companies up to three people, and a company automation tier at $0.01/render with a $100/month minimum. Eligibility and terms must be checked at adoption; do not treat it as an unrestricted MIT dependency. [Remotion pricing](https://www.remotion.dev/docs/license/pricing), [rendering options](https://www.remotion.dev/docs/render)

## 12. Validation and release gates

### Test corpus

At least twelve owned or permitted fixtures: clean article, two-column paper, dark-mode post, scanned page, low-resolution crop, large Retina screenshot, long receipt, table, multiline sentence, region near page edge, non-Latin text, and a source with colored background. Use synthetic fixtures for automated tests where possible.

### Technical acceptance

- Image-to-preview pointer mapping remains correct at multiple editor zoom levels and device pixel ratios.
- All selected words stay within the intended framing through the camera move.
- A six-second 60 fps export has 360 frames; a supported 120 fps export has 720 frames with the expected duration; validate metadata and decoded frame count.
- Start, mid-reveal, and settled exported frames match preview geometry; allow codec compression differences.
- Reopening a portable project reconstructs its source, timing, and appearance without stale object URLs.
- Cancelled and failed exports release resources and can be retried.
- Unsupported encoding configurations fail before a long render.
- Three repeated exports do not show unbounded memory growth.
- Import and scrub the MP4 in QuickTime and the user's actual editor. Expand the matrix before claiming universal support.
- Confirm no screenshot uploads by inspecting requests during import, detection, save, and export.

### Visual and workflow acceptance

- A user unfamiliar with animation can make a one-beat shot without touching a keyframe.
- Simple shots take under 60 seconds of hands-on editing after familiarization.
- Text is readable at normal playback size; no marker flicker, accidental glyph coverage, or clipped lines.
- The source remains identifiable when context matters.
- Multi-beat shots hold long enough to read and do not jerk between nearby regions.
- Target on the chosen baseline Mac: smooth preview and a six-second 1080p60 export in under 45 seconds. Record exact hardware/browser and measurements; this target is not a guarantee.

### Risk register

| Risk | Mitigation / decision |
|---|---|
| Browser advertises support but output fails | Encode a short probe and test decoded playback on target hardware |
| Preview differs from export | One shared renderer with frame-indexed state |
| OCR selects wrong lines | Manual selection remains available at all times |
| Long or narrow screenshots frame poorly | Context controls, zoom limits, multiple beats |
| 4K or large scans exhaust memory | Input caps, proxies, bounded export queue, 4K deferred |
| Browser clears project storage | Explicit portable bundle export |
| Feature scope expands into a full editor | Keep the product centered on screenshot inserts |
| Existing tool already solves the problem | Compare real tasks before committing to a full build |

## 13. Privacy and distribution boundaries

Process image pixels locally by default. Load static assets and optional OCR models from bundled or declared sources; local processing does not mean the app makes no network requests. An offline claim requires caching and a real offline test.

Accept raster inputs first; do not execute imported HTML or SVG. In a desktop shell, expose narrowly scoped file/export operations rather than arbitrary filesystem or shell access. Review licenses for the exact shipped libraries, fonts, textures, and any native codec binary before distribution. These are implementation boundaries, not additional approval steps for the current documentation task.

## 14. First build ticket

**Build the smallest complete screenshot-to-MP4 path.**

Inputs: one PNG/JPEG and one manually drawn rectangle. Output: one six-second 1920×1080, 60 fps H.264 MP4. Visuals: source context, eased push-in, yellow marker reveal, stable hold. Controls: upload/paste, select, play, export. Include one geometry test and an exported-frame check.

Do not add OCR, accounts, batch rendering, desktop packaging, sound, or a preset marketplace to this ticket. The gate is a file that looks right and imports into the user's editor. If this fails on the intended Mac/browser, resolve the export architecture before building the rest of the interface.

## 15. Decisions to settle during the spike

These are not blockers to starting with the defaults above:

- Which editor receives the clips? The confirmed default is 60 fps; validate 120 fps on the intended Mac and editor.
- Are full-frame MP4s sufficient, or are ProRes/transparent overlays actually necessary?
- Is the main workload one selected sentence or several sequential highlights?
- Is 1080p sufficient for initial use?
- Which two or three actual clips best capture the desired motion and texture? Record timestamps and analyze them before tuning the final preset library.
- Is this a personal utility or a product for other editors? That changes packaging, browser coverage, licensing review, and support priorities.

## 16. Research limits

Research used official product descriptions and technical documentation linked throughout this file. No competitor benchmark, native application trial, library spike, or export compatibility test was performed. Product claims are attributed; architecture, effect recipes, effort, thresholds, and acceptance targets are proposals. Exact Vox/Johnny Harris/Netflix workflows have not been established. The first implementation phase is specifically designed to replace these remaining assumptions with evidence.


## 17. Expanded creative controls — confirmed direction

The intended product goes beyond a fixed highlight preset. Keep the initial interaction simple, but provide an Advanced inspector for each selected text line or body region. The requirements below are part of the expanded MVP unless marked experimental or later. `docs.yaml` is the structured requirements companion; keep it and this document synchronized.

### Selection, dimming, and color

A selection can target a line, several grouped lines, or an arbitrary rectangular body area. Support dimming **inside** the selection, **outside** it, or neither. Separate dim amount from highlight opacity. A tint has its own color and strength; tinting the source and changing the marker color are different operations. Each region can override the group style, inherit it, or copy another region's style. All changes are undoable and can be saved as a personal preset.

### Highlighter shape and animation

Expose color, opacity, thickness, padding, angle, corner radius, edge feather, and independent start/end caps (flat, round, chisel). The user's “ease in radius” is interpreted as two separate controls: spatial rounding/softness and temporal reveal easing. Neither should unexpectedly change the other.

Use draggable start/end handles in source-image coordinates. They define the marker path independently of the selected evidence rectangle, allowing overhangs and angled strokes. Start and end trim percentages control the painted interval along that path. Reveal start time, duration, direction, and easing remain separate controls. Offer linear, ease-in, ease-out, ease-in-out, and custom cubic Bézier curves. Camera easing is separate from marker easing.

### Texture and turbulent displacement

Provide solid, felt-tip, dry-marker, and streaked textures, with texture strength, scale, rotation, and seed. Allow an imported raster texture as an advanced option; store it in the portable project. Texture affects marker coverage and must not distort the original document.

Expose displacement amount, spatial wavelength, detail/octaves, seed, and optional evolution speed. Distinguish displaced edges from a displaced whole marker mask. Zero amount produces a straight band. Static seeded displacement is the default; animated evolution is opt-in and evaluated from absolute time. Cap amplitudes relative to band thickness to avoid self-intersections. Apply displacement to the marker mask before reveal and compositing; keep it anchored to the document while the camera moves.

Canvas 2D can use cached procedural masks for static texture and displaced geometry. Benchmark animated full-mask displacement separately; adopt an offscreen GPU shader only if profiling warrants it. Shader effects must use the same rendering path in preview and export. This makes advanced displacement medium–high complexity rather than a cheap cosmetic slider.

### Blend modes and inversion

Offer Normal, Multiply, Screen, Overlay, Difference, and Exclusion. Normal maps to Canvas `source-over`; UI names and render values should be explicit. The mode is independent of whether the stroke is straight or textured. Canvas documents these operations in [globalCompositeOperation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation).

Provide a dedicated **Invert under stroke** preset. Fully opaque white with Difference produces `out = 1 - source` inside the revealed mask: black text becomes white, and white paper becomes black. A colored Difference stroke produces a different result and is not equivalent to full inversion. At partial opacity or feathered edges, interpolate toward the inverted result. Sample the original source patch for inversion so dimming does not accidentally change its meaning.

**Recolor text only** is a separate experimental feature. A flattened screenshot does not contain an isolated text layer. For clean monochrome pages, a luminance-derived glyph mask with threshold and softness can recolor dark glyphs; illustrations, scans, colored text, and antialiasing can break it. Provide a mask preview and manual correction/fallback. Do not promise that a blend mode alone can turn only the text white while preserving every background pixel.

### Compositing order and overlaps

Use a fixed documented order: original source → source tint → dim treatment → marker effects in explicit region order → labels. Each marker owns its geometry, texture, reveal mask, opacity, and blend setting. The dedicated inversion preset samples the original source patch, while ordinary blend modes use the current composited backdrop. Overlapping inversion masks within one beat are unioned to prevent accidental double inversion; ordinary markers respect layer order. Add overlap fixtures to verification.

### High-frame-rate export requirements

The first project opens at **16:9, 1920×1080, 60 fps**. A user may save 120 fps as their default after the actual dimensions/codec/rate pass capability and encode tests. Capability checks alone are insufficient: verify a short file in the target editor. [VideoEncoder configuration checks](https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder/isConfigSupported_static)

Evaluate motion at the output rate, not at a fixed 30 fps followed by frame duplication. Changing fps preserves durations in seconds and recalculates frame indices; rounding must be bounded to one output frame. Preview may run at display refresh or reduced resolution without changing the export rate. Show the selected ratio, dimensions, and fps in the export dialog and final filename. Probe 1080p120 independently of 1080p60; 4K60/120 remains a later benchmark target, not a release promise.

### Additional release checks

- New projects start at 16:9/60 fps; a saved supported higher default is restored.
- Both inside/outside dimming work independently of tint and marker color.
- Texture, displacement, caps, endpoints, trims, and easing survive save/reopen and undo/redo.
- Seeded appearance is stable at the same time across seeks and exports.
- White Difference inversion is checked against black, white, and colored fixture patches; feathered edges do not create unwanted halos.
- Straight strokes support the same blending controls as irregular strokes.
- Render at 60 and supported 120 fps without reducing motion to repeated 30 fps states; stationary holds may naturally repeat.
- FPS changes preserve shot duration, beat ordering, and highlight timing within one output frame.
- Benchmark the worst supported combination of texture, evolution, dimming, and blend mode with bounded memory.

### Revised build order

First prove 1080p60 export plus one marker, dimming, and Difference inversion. Next deliver the usable editor with manual endpoints, color, blending, and saved projects. Then add texture, static displacement, temporal easing, caps/radius, and personal presets. Validate optional 120 fps and animated displacement before advertising them. Text-only recoloring remains experimental. Estimated expanded MVP effort is 5–8 weeks, with 9–14 weeks total for broader release; revise after the spike.


## 18. Implementation checkpoint — 20 October 2026

The first core engine slice is implemented. `README.md` is the guide to running it; `src/index.ts` exposes the engine API. The browser lab is a test harness, with no React dependency or hosted backend. Rendering and encoding happen locally in a dedicated worker.

Implemented: strict project validation, second-based timing, camera motion, multiline selection/reveal, marker and underline, spotlight/dimming, tint, blend modes, original-source inversion, basic seeded texture/edge displacement, custom endpoints and trim, undo/redo, portable projects, and IndexedDB autosave. Output defaults to 1080p60 with explicit 120 fps capability checks.

The implementation intentionally stores timing in seconds instead of the earlier manifest sketch's frame indices. This preserves timing across FPS changes. The actual schema in `src/core/project.ts` is authoritative for runnable projects; `docs.yaml` remains the broader product requirements, not a project manifest.

Real Chrome tests generated and decoded 360-frame 1080p60 and 720-frame 1080p120 clips. Independent ffprobe validation confirms the 60 fps output's H.264 codec, dimensions, six-second duration, and frame count. Machine-specific results and generated files are in `artifacts/`. Manual import in the user's editing application remains untested.

Not complete: imported brush textures, full cap/feather controls, cubic Bézier editing, animated displacement shaders, preset management, 4K, ProRes/alpha, and broad browser testing. Earlier research-only statements describe the initial study; the current implementation and test evidence are recorded here and in the README.


### Default look revision — reference supplied 20 October 2026

New shots use sharp, opaque inversion bands and a 72% white fade outside the selected text. On light monochrome pages this gives light text on black with pale surrounding text, matching the supplied reference. The lab includes Apply reference look for existing saved shots, plus White/Black fade selection. Source colors are inverted, not OCR-reconstructed; original marker styles remain selectable.
