# YellowPen

A single-page, white-theme screenshot-to-video editor. No account or backend required.

Detailed instructions: [HOW_TO_USE.md](HOW_TO_USE.md). Developer and LLM handoff: [context.md](context.md).

## Run and host

```sh
npm ci
npm run dev
# Production:
npm run build
npm run preview
```

Deploy the complete `dist/` directory to a static HTTPS host. Build command:
`npm run build`; publish directory: `dist`. Node 22.12+ is required for building.
Do not exclude `dist/ocr`: it contains the self-hosted worker, WASM engines and
English recognition model. The preparation script copies these from pinned npm
packages. The Mac helper is no longer part of the primary workflow.

## Workflow

1. Drop, paste or choose a PNG/JPEG screenshot (12 MB / 25 megapixel limit).
2. Browser OCR extracts text. Review and correct it, then choose **Use this text**.
3. Select words. Hover or keyboard-focus an effect to see an animated popup using
   those words. Before upload it uses the sample document. On touch, choose an
   effect and use **Animate selection** for the full preview.
4. Download a **3840×2160, 60 FPS, six-second H.264 MP4**. These output settings
   are fixed. The camera does not move. Text is rasterized at double the previous
   resolution and the preview canvas is also 3840×2160.

Underline, highlighter, black block and focus-only use the same deterministic
renderer in the popup, full preview and export. Custom exposes spacing, text
width, ink texture and source/logo controls; named presets are stored locally.
Source credit stays bottom-left; uploaded logos/media names stay top-left.
Projects save text, selection, source image and template together. Old projects
recompose with the fixed 4K/60 settings and disabled camera when opened here.

## Privacy and browser limits

Screenshots are processed on-device using Tesseract.js in a worker. Engine and
English model files are downloaded from your own host on first use; image pixels
and recognized text are not sent to an OCR service. Faded ink on predominantly
white pages is strengthened before recognition. OCR still makes mistakes (for
example AI vs Al); review is required. English OCR is bundled; other scripts are
not promised by a template name. Typed Unicode text uses the browser's fonts.

4K/60 H.264 encoding requires a compatible browser/device and HTTPS (localhost is
also supported). Before export, a real encode/decode probe runs. Unsupported
hardware receives an error; the app never silently reduces quality. Desktop
Chromium on the tested Mac passed. This is not a claim of cross-browser support.
Large screenshots and 4K frames use significant memory; keep individual shots to
short excerpts. The page loads OCR only when needed. There is no automatic remote
website-logo lookup in this static release; upload a logo or enter a media name.

## Verification

`npm run check` runs 31 unit tests and the production build. A production browser
session verified screenshot upload and paste, pale-text OCR, review, selection,
preview, effect popup, and export. ffprobe independently confirmed the downloaded
MP4: 3840×2160, 60/1 FPS, 360 frames, 6.000 seconds. See
`artifacts/release-check.md` for the tested scope and remaining launch checks.

The older `src/lab` editor, native helper and original browser-test scripts are
retained as legacy development references, not the current release interface.
