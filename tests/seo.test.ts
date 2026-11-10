import { describe, expect, it } from 'vitest';
// @ts-expect-error Build-only JavaScript module.
import { seoAssets } from '../scripts/seo.mjs';
describe('public discovery assets', () => {
  it('uses one configurable canonical origin and supplies both LLM filenames', () => {
    const {origin,files}=seoAssets('https://example.com/');
    expect(origin).toBe('https://example.com');
    expect(files['robots.txt']).toContain('Sitemap: https://example.com/sitemap.xml');
    expect(files['sitemap.xml']).toContain('https://example.com/guide.html');
    expect(files['guide.html']).toContain('rel="canonical" href="https://example.com/guide.html"');
    expect(files['llm.txt']).toBe(files['llms.txt']);
    expect(Object.values(files).join('')).not.toContain('localhost');
  });
  it('rejects invalid production origins', () => {
    for(const url of ['http://example.com','https://example.com/subpath','https://example.com/?q=x']) expect(()=>seoAssets(url)).toThrow();
  });
});
