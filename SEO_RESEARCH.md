# Yellowpen search positioning

Research date: 24 October 2026. Provisional public origin: https://yellowpen.fromsilicon.com. This research uses public search results and product descriptions, not keyword-volume data. No ranking or demand numbers are claimed.

| Search intent | Wording | Product fit |
| --- | --- | --- |
| Highlight screenshot text | image text highlighter | Primary category; qualify with animation to distinguish static image tools |
| Animate existing screenshots | animate text in screenshots | Closest workflow, although Yellowpen reconstructs the text rather than preserving the image |
| Create a video effect | text highlight animation | Relevant to editors; distinguish source excerpts from subtitle effects |
| Annotate an image | highlight part of an image online | Adjacent intent; do not imply Yellowpen exports annotated PNGs |

## Evidence and decisions

[Effect Control’s Image to Text Highlighter guide](https://effectcontrol.com/page/help-image-text-highlighter) uses the image/text/highlighter category and describes screenshot-to-video work. [PimpMySnap](https://www.pimpmysnap.com/) uses “animate your screenshots.” [CreatorsKit’s Text Highlighter](https://creatorskit.win/text-highlighter) uses animated highlight language for creators. These are evidence of category vocabulary, not independent proof of search volume.

Use the lowercase title **image text highlighter & animation | yellowpen**. Keep Yellowpen as the brand and retain the direct-to-editor homepage. Avoid generic “img to highlight,” which explains less clearly what the output is. Put the how-to and limitations on a separate crawlable guide rather than adding a landing page to the editor.

## SEO and answer-engine implementation

- Title, description, canonical, robots directive, Open Graph and Twitter metadata.
- WebApplication JSON-LD with actual features and browser requirements; no invented reviews, ratings or prices.
- Static HTML guide with direct answers covering workflow, OCR, privacy, export format and device limitations; Markdown equivalent.
- Sitemap and robots.txt reference the same configurable origin as canonical links.
- Standard /llms.txt plus /llm.txt alias, with concise factual product context and links.
- Matching SVG favicon and 1200 × 630 social card.

[Google’s AI optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) supports normal crawlability and useful content; special AI files do not guarantee inclusion. [Google’s software application structured-data documentation](https://developers.google.com/search/docs/appearance/structured-data/software-app) distinguishes structured data from eligibility for rich results. [llms.txt](https://llmstxt.org/) is a proposed convention, not a search ranking standard or crawler access control.

## Configuration and launch

`scripts/seo.mjs` is the source of truth for generated discovery files and public guide. Vite emits these files during build and serves them in development. Set `SITE_URL=https://your-domain.example npm run build` to change the public origin. Default: https://yellowpen.fromsilicon.com. Do not edit dist files.

The domain is provisional. Nothing has been deployed or registered. Before launch: connect the chosen domain and HTTPS, serve dist, verify /robots.txt, /sitemap.xml, /guide.html, /llms.txt and /social.png return their actual files (not an SPA fallback), and submit the sitemap in Search Console once ownership is verified. Rebuild when the origin changes. Confirm the social card in platform preview tools after deployment. Search Console data can later validate which queries bring actual visitors.
