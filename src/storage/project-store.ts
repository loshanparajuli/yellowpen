import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { parseProject } from '../core/project';
import type { Project } from '../core/project';
import { decodeImage, MAX_IMAGE_BYTES } from './image';

export async function packProject(project: Project, image: Blob): Promise<Blob> {
  const p = parseProject(project);
  const decoded = await decodeImage(image);
  const matches = decoded.width === p.source.width && decoded.height === p.source.height; decoded.close();
  if (!matches) throw new Error('Project dimensions do not match the source asset.');
  const file = image.type === 'image/png' ? 'source.png' : 'source.jpg';
  const data = zipSync({ 'project.json': strToU8(JSON.stringify(p, null, 2)), [file]: [new Uint8Array(await image.arrayBuffer()), { level: 0 }] });
  return new Blob([data as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
}
export async function unpackProject(blob: Blob): Promise<{ project: Project; image: Blob }> {
  if (blob.size > MAX_IMAGE_BYTES + 1024 * 1024) throw new Error('Project bundle is too large.');
  let total = 0;
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()), { filter: entry => {
    if (!['project.json', 'source.png', 'source.jpg'].includes(entry.name)) return false;
    total += entry.originalSize;
    if (entry.originalSize > (entry.name === 'project.json' ? 512 * 1024 : MAX_IMAGE_BYTES) || total > MAX_IMAGE_BYTES + 512 * 1024) throw new Error('Project expands beyond the allowed size.');
    return true;
  } });
  if (!files['project.json']) throw new Error('Project manifest is missing.');
  const assets = ['source.png', 'source.jpg'].filter(name => files[name]);
  if (assets.length !== 1) throw new Error('A project requires exactly one PNG/JPEG source.');
  const project = parseProject(JSON.parse(strFromU8(files['project.json'])));
  const image = new Blob([files[assets[0]] as Uint8Array<ArrayBuffer>], { type: assets[0].endsWith('.png') ? 'image/png' : 'image/jpeg' });
  const decoded = await decodeImage(image);
  const matches = decoded.width === project.source.width && decoded.height === project.source.height; decoded.close();
  if (!matches) throw new Error('Saved project and image dimensions disagree.');
  return { project, image };
}
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('yellowpen', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('projects');
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
export async function saveLocal(project: Project, image: Blob) {
  const snapshot = parseProject(project), db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      tx.objectStore('projects').put({ project: snapshot, image }, 'current');
      tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Autosave failed.'));
    });
  } finally { db.close(); }
}
export async function loadLocal(): Promise<{ project: Project; image: Blob } | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction('projects').objectStore('projects').get('current');
      req.onsuccess = () => { try { resolve(req.result ? { project: parseProject(req.result.project), image: req.result.image } : undefined); } catch (e) { reject(e); } };
      req.onerror = () => reject(req.error);
    });
  } finally { db.close(); }
}
