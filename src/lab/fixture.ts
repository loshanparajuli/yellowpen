/** Original synthetic source for repeatable export tests; no remote assets or fonts. */
export async function fixture() {
  const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1100;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fffefa'; ctx.fillRect(0, 0, 1600, 1100);
  ctx.fillStyle = '#776c55'; ctx.font = '22px sans-serif'; ctx.fillText('FIELD NOTES     /     RESEARCH & OBSERVATIONS', 130, 110);
  ctx.fillStyle = '#1c2528'; ctx.font = 'bold 64px Georgia'; ctx.fillText('Make the evidence visible.', 130, 235);
  ctx.fillStyle = '#727774'; ctx.font = '24px sans-serif'; ctx.fillText('A sample document for the YellowPen rendering engine', 130, 294);
  ctx.fillStyle = '#d9d6cd'; ctx.fillRect(130, 335, 1340, 2);
  ctx.fillStyle = '#28302f'; ctx.font = '32px Georgia';
  const lines = [
    'A screenshot can hold a whole page of information. The challenge',
    'is helping an audience see the small part that actually matters.',
    'A deliberate camera move gives the document context.',
    'A moving highlight brings attention to one important claim.',
    'And a quiet pause gives the viewer enough time to read it.',
    '',
    'Good animation does not need to replace the original evidence.',
    'It simply makes the evidence easier to follow.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 130, 420 + i * 62));
  ctx.fillStyle = '#777'; ctx.font = '20px sans-serif'; ctx.fillText('SYNTHETIC TEST DOCUMENT     •     No external source material', 130, 1010);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not create fixture.')), 'image/png'));
  return { blob, regions: [{ x: 120, y: 575, width: 1130, height: 46 }] };
}
