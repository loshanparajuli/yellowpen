# How to use YellowPen

YellowPen turns text from a screenshot into a short animated video. It opens directly
into a white editor. There is no sign-in, landing page, timeline or automatic zoom. The page fits the screen; long documents and expanded settings scroll inside their own panels.

## 1. Open the editor

If someone has hosted YellowPen, open their HTTPS URL in a desktop browser.
For development on your own computer, install Node.js 22.12 or newer, open a terminal
in this project folder, and run:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The port may change if another app is already using
it. Previously used addresses include `http://127.0.0.1:5174/` for development and
`http://127.0.0.1:4173/` for a production preview; they only work while those servers run.

Start with the example document, or add your own image. A previously generated
project may be restored automatically from this browser's local storage.

## 2. Add your source

You can:

- Drag a PNG or JPEG screenshot onto the page.
- Click **Drop your screenshot** to choose a file.
- Paste an image from your clipboard with Command-V on Mac or Ctrl-V on Windows.
- Click **Paste or edit text** and enter text directly, skipping OCR.

Screenshot limits are 12 MB, 25 megapixels and 15,000 pixels on either axis.
Crop to the passage you need for best results. PDFs and other image formats are
not accepted as screenshot inputs; take a screenshot or convert them first.

OCR runs inside your browser. Its engine and English language model load from the
same website the first time they are needed, so the first read can take longer.
Your image is not sent to a cloud OCR service. Choose **Cancel reading** to stop.

## 3. Check the extracted text

The editor shows the extracted words in an editable field. Correct spelling,
punctuation, reading order and line breaks. OCR can confuse `AI` with `Al`, and
cannot recover words cut off by the screenshot. English recognition is bundled;
a template named Nepali Comment does not enable Nepali OCR.

White-page preprocessing helps recover faded grey text. Complex layouts, photos,
columns and low-resolution images can still produce mistakes. If recognition fails,
paste the text manually.

Choose **Use this text** when ready. This creates a clean text document: the app
rebuilds the text rather than preserving the screenshot's original layout, fonts,
images or decorations. The white document area is where you choose your words;
the rendered preview shows the actual video layout.

## 4. Select the words

Drag across a word, phrase or several lines in the document. The selected passage
appears beneath it. Choose **Select all** if the whole excerpt should be emphasized.
Selections use exact character positions, so repeated phrases can be distinguished.
Up to 32 rendered lines can belong to one selection. Short passages work best.

## 5. Choose an effect

| Effect | Result |
| --- | --- |
| Underline | A colored line draws under the selected words; surrounding text fades. |
| Highlighter | A marker stroke reveals across the words, with adjustable ink texture. |
| Black block | The selected area inverts; black text on white becomes white text on black. |
| Focus | Surrounding text fades without a marker or underline. |

Hover over an effect button to see a small animated example above the pointer.
Keyboard focus also opens this preview; Escape dismisses it. The example uses your
current document and selection. If you have not selected anything, it uses an
opening portion of the document. Before importing an image, it uses the sample text.
On touch devices, choose an effect and use the full preview instead of hovering.

The popup and exported video share the same renderer. The popup is smaller, so
judge final readability using the full preview and exported video.

## 6. Use or customize a template

Choose a template:

- **Classic:** a clean red underline with faded surrounding text.
- **Juniorist:** tighter side padding and line spacing.
- **Nepali Comment:** yellow marker ink with some texture.
- **Custom:** your own settings, available under **Custom · tweak & save**.

Custom controls:

| Control | What it changes |
| --- | --- |
| Typeface | Sans-serif or serif text. |
| Side padding | Space on the left and right of the document. |
| Text width % | How much of the available width the text occupies before wrapping. |
| Text size | Size of the rebuilt text. |
| Line spacing | Vertical space between lines. |
| Ink color | Underline or marker color; black-block inversion is independent of it. |
| Roughness | Gaps and texture in the ink. |
| Distortion | Irregularity along the stroke edges. |
| Roundness | Rounding at the stroke ends. |
| Ink opacity | Strength of the visible stroke. |
| Fade surroundings | How pale the unselected text becomes. |

Some ink controls have no visible effect in Focus mode, which draws no stroke.
Changing settings requires **Animate selection** again to rebuild the full preview.
There is no zoom control: the camera stays fixed throughout the video.

### Source and logo

Optionally enter a **Source credit**, shown at the bottom left of the video.
Enter a website or media name to show it at the top left, or upload a logo there.
A logo takes precedence over the media-name text. These elements remain fixed.

Drop an image onto the logo upload area specifically, or click it to choose one.
Logo uploads accept PNG, JPEG or WebP under 2 MB. They are normalized to a small
embedded PNG. **Remove logo** returns to the text label, if provided. There is no
automatic website-logo lookup in this release.

### Save a reusable style

Enter a **Template name**, then click **Save as template**. The template stores
layout, effects, source credit and logo; it does not store the document's words.
It appears in the template menu in this browser. Reusing a name replaces that
saved template. Up to 30 custom templates are supported.

## 7. Preview and download

Click **Animate selection**. The preview draws the effect on a static frame.
Use **Replay** to watch it again, or **Select other words** to return to selection.
The preview canvas has a 3840×2160 backing resolution even when displayed smaller.

Click **Export · 4K · 60 FPS** in the top-right header. The button stays visible and enables after a preview is generated. Every video from this editor uses:

- 3840×2160 pixels, 16:9.
- 60 frames per second.
- Six seconds, 360 frames.
- H.264 video in an MP4 file; no audio track.

There are no dimension or frame-rate controls. The browser first tests an actual
encode and decode, then renders the video in a worker. **Cancel export** stops it.
Do not close the tab while exporting. Downloads normally go to your browser's
Downloads folder; the file is named `yellowpen-spotlight.mp4`.

If 4K/60 encoding is unavailable, the app reports an error. It does not quietly
produce a lower-resolution video. Use compatible desktop hardware and a browser
with WebCodecs support; the tested desktop Chromium/Mac configuration worked.

## 8. Save your work

After generating a preview, **Save editable project** downloads a `.yellowpen`
file containing the generated text image, editable text, selection and settings.
Use **Open saved project** to reopen it, then animate again. Reopened text projects
use the current fixed 4K/60 output and disabled camera.

The latest generated shot also autosaves locally. Local autosave and templates
belong to the browser and website origin: changing the port, switching browsers,
using private mode or clearing website data may make them unavailable. Keep a
project-file backup for work you need to retain. Draft text edits are not a
substitute for generating and saving a project.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| No readable text | Use a tighter, clearer crop or paste the words manually. |
| Wrong words or order | Correct the OCR text before using it; separate columns if needed. |
| Animate button disabled | Select visible words or choose Select all. |
| Excerpt too long | Shorten the text. Large documents shrink to fit a static shot and may exceed the 4K source-memory limit. |
| Custom changes not visible | Click Animate selection again. |
| Export unsupported | Use HTTPS or localhost and compatible desktop browser/hardware. There is no quality fallback. |
| Saved style seems missing | Return to the same browser and website address; custom templates are local. |
| OCR assets fail to load on a hosted site | Ensure the entire `dist/ocr` directory was deployed with the build. |

## Publishing your own copy

Run `npm run check`, then deploy the complete `dist/` folder to a static HTTPS host.
The build command is `npm run build`; the publish directory is `dist`. No Mac
helper, backend, OCR API key or database server is required. The project has not
been publicly deployed as part of this work. Test the public URL on your target
browsers before announcing availability.

## Adjust text and spacing

Choose Clean sans or Editorial serif under Typeface. Open Text & spacing to adjust text size, side padding, top/bottom margin, text width and line spacing. The text view updates as you move each slider. Measurements use a 1920px layout and scale to 4K output. Click Animate selection after making changes to regenerate the animation and enable export. Save as template in Custom to reuse these settings.

## Timing

Use Timing → Video duration to set 2–20 seconds. Highlight draw sets how long the stroke takes to finish; it remains visible afterward. The lead-in shortens automatically if necessary, and shortening the video also caps the draw duration to fit. Click Animate selection after changing timing. Timing is saved in custom templates and project files. Export stays 4K at 60 FPS.

### Live preview updates
Once the animation preview is open, change fonts, padding, size, spacing or other settings and the preview updates automatically. You do not need to click Animate again. It shows the finished highlight so you can judge the layout; use Replay to watch the motion. Export becomes available as soon as the updated preview is ready. Before the first animation, the selectable document updates directly as you adjust text controls.

## Paste a screenshot or keep the original image

Click **Paste screenshot** to read a copied PNG/JPEG image from your clipboard. Your browser may request clipboard access. If access is unavailable or denied, use ⌘V / Ctrl+V, drag and drop, or choose a file instead. Copy the actual image, not only its URL.

All screenshot imports offer two choices:
- **Use as-is:** preserve the original screenshot and place it on a backdrop. No OCR is run. Drag a box over a word, line or area to animate a highlight without OCR. Add more boxes in reading order, choose Underline, Highlighter or Invert, and adjust color and draw time. Undo region removes the last box; Clear removes all boxes. With no boxes, export produces a static composition.
- **Extract text:** recognize the words, review/edit them, then select text to highlight using the existing editor.

As-is mode offers Paper, Sand, Slate, Midnight and Lavender gradients, a blurred copy of the screenshot, or a custom solid color. Backdrop space controls the gap around the screenshot. Corner radius and shadow shape its presentation. Background blur applies only to the Blurred image preset; the foreground screenshot stays sharp. All adjustments update the preview automatically. Set a 2–20 second video length and export at 4K/60 FPS. Save editable project preserves the original image and backdrop settings. Extract text with OCR switches to the text workflow whenever needed.
