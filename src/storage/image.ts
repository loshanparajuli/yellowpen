export const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
export async function decodeImage(blob: Blob): Promise<ImageBitmap> {
  if (!['image/png', 'image/jpeg'].includes(blob.type)) throw new Error('Choose a PNG or JPEG screenshot.');
  if (blob.size > MAX_IMAGE_BYTES) throw new Error('Image exceeds the 40 MB file limit.');
  const image = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  if (image.width * image.height > 25_000_000 || image.width > 15000 || image.height > 15000) {
    image.close(); throw new Error('Image exceeds 25 megapixels or 15,000 pixels on an axis. Crop or downscale it first.');
  }
  return image;
}
