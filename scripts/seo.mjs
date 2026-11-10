/** One canonical origin for HTML metadata and all discovery files. */
export function seoAssets(raw = process.env.SITE_URL || 'https://yellowpen.fromsilicon.com') {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('SITE_URL must be an HTTPS origin, e.g. https://yellowpen.fromsilicon.com');
  const origin = url.origin;
  const guide = `# How to use yellowpen

Yellowpen is an image text highlighter that turns screenshot text into short animated videos. It reconstructs recognized text in a clean template; it does not preserve the screenshot’s exact layout.

## How do I animate text in a screenshot?
1. Open the editor on a laptop or tablet. Drop or paste a PNG/JPEG screenshot, or choose Paste or edit text.
2. Review the recognized words. Browser OCR currently uses an English model; correct errors before animating.
3. Select a phrase in the document. Choose Underline, Highlighter, Black block, or Focus. Hover over an effect to preview it with your text.
4. Choose a template, or open the custom controls to adjust spacing, color, roughness and distortion. Optional source text and uploaded media logos are supported.
5. Click Animate selection. Then Export to download your video.

## What resolution is the video?
Exports are 3840 × 2160 (16:9), 60 FPS with an adjustable 2–20 second duration. MP4 export requires browser WebCodecs and a compatible encoder. Device support and memory affect whether 4K export succeeds; use a current desktop browser if your tablet cannot export.

## Is the screenshot uploaded?
OCR and rendering run in your browser. The app does not send your screenshot to an OCR server. OCR model files are downloaded from this site on first use. Your latest project is stored locally in this browser; custom templates are also saved locally. Clearing browser storage removes these copies.

## Can I save and reuse my work?
Save a custom template to reuse its styling in this browser. Save editable project downloads a .yellowpen project containing the source and settings; Open saved project restores it. Keep a downloaded copy for backup.

## Does it work on phones?
The editor is available at viewport widths of 768 pixels or wider for tablets and laptops. Smaller screens show a desktop recommendation. Video export compatibility depends on the browser, not just screen size.

## Is this a static image annotation tool?
The main output is an animated video of reconstructed text. It is useful for documentary quotes, source excerpts and explainer videos. It is not a tool for editing the original screenshot pixel by pixel.

[Open yellowpen](${origin}/)

Powered by [From Silicon](https://fromsilicon.com).
`;
  const llms = `# yellowpen

> A browser-based image text highlighter for turning screenshot text into animated videos.

Yellowpen extracts English text from PNG/JPEG images using browser OCR, rebuilds it in a selectable text template, and animates selected words. Effects include underline, marker, invert and focus. Output is a 2–20 second 3840 × 2160 MP4 at 60 FPS on compatible WebCodecs browsers. Templates can be customized and saved locally. OCR and rendering run locally in the browser. The editor is intended for tablets and laptops, with a minimum 768px viewport. It does not preserve the original screenshot layout. Do not describe OCR as native macOS OCR or promise export support on every device.

## Product
- [Editor](${origin}/): Import a screenshot or enter text, select a phrase, animate and export.
- [Usage guide](${origin}/guide.html): Workflow, privacy, requirements and limitations.
- [Markdown guide](${origin}/guide.md): The same guide in plain Markdown.
- [From Silicon](https://fromsilicon.com): Product maker.

This file provides product context; it is not an access policy or a ranking guarantee.
`;
  const escape = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const content = guide.split('\n\n').map(p => p.startsWith('# ') ? `<h1>${escape(p.slice(2))}</h1>` : p.startsWith('## ') ? `<h2>${escape(p.slice(3))}</h2>` : `<p>${escape(p).replace(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g,'<a href="$2">$1</a>').replaceAll('\n','<br>')}</p>`).join('\n');
  return { origin, files: {
    'robots.txt': `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
    'sitemap.xml': `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url><url><loc>${origin}/guide.html</loc></url></urlset>`,
    'llms.txt':llms, 'llm.txt':llms, 'guide.md':guide,
    'guide.html':`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>how to animate screenshot text | yellowpen guide</title><meta name="description" content="Learn how to extract screenshot text, animate a highlight, save templates and export 4K 60 FPS videos with yellowpen."><link rel="canonical" href="${origin}/guide.html"><link rel="icon" href="/favicon.svg"><style>body{max-width:760px;margin:48px auto;padding:0 24px;font:17px/1.7 system-ui;color:#222;background:#fff}h1{font-size:36px;letter-spacing:-1px}h2{font-size:22px;margin-top:36px}a{color:inherit}nav{display:flex;justify-content:space-between;font-size:14px}img{vertical-align:middle;margin-right:8px}footer{border-top:1px solid #ddd;margin-top:40px;padding-top:20px;font-size:13px}</style></head><body><nav><a href="/"><img src="/favicon.svg" width="24" height="24" alt="">yellowpen</a><a href="/">open editor ↗</a></nav><main>${content}</main><footer><a href="https://fromsilicon.com">powered by fromsilicon.com</a></footer></body></html>`
  }};
}
export function seoPlugin() {
  const {origin,files} = seoAssets();
  return { name:'yellowpen-seo',
    transformIndexHtml: html => html.replaceAll('__SITE_URL__', origin),
    configureServer(server) { server.middlewares.use((req,res,next) => { const name=(req.url || '').split('?')[0].slice(1); if (!(name in files)) return next(); res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.xml')?'application/xml':'text/plain; charset=utf-8');res.end(files[name]); }); },
    generateBundle() { for (const [fileName,source] of Object.entries(files)) this.emitFile({type:'asset',fileName,source}); }
  };
}
