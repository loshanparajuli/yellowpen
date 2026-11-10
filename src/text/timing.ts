/** Leave at least one completed-highlight frame in the exported shot. */
export function textTiming(videoDuration: number, highlightDuration: number) {
  const reveal = Math.min(highlightDuration, videoDuration - .1);
  const start = Math.min(1.4, Math.max(0, videoDuration - reveal - .1));
  return { duration: videoDuration, start, reveal, hold: Math.max(0, videoDuration - start - reveal) };
}
