import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const themesRoot = fileURLToPath(new URL('../../themes/', import.meta.url));
export const defaults = Object.freeze({
  schemaVersion: 1, name: 'Untitled', mode: 'dark', image: 'background.jpg',
  focusX: 76, focusY: 42, imageWidth: 52, intensity: 36, taskIntensity: 15,
  surfaceOpacity: 68, blur: 12, radius: 14,
  accent: '#c8d7df', text: '#eceff1', muted: '#a5aab2', background: '#141518', surface: '#23252a'
});
const ideFallback = { ideSurfaceOpacity: 'surfaceOpacity', ideBlur: 'blur' };
const ranges = { focusX: [0,100], focusY: [0,100], imageWidth: [30,100], intensity: [0,100], taskIntensity: [0,100], surfaceOpacity: [0,100], blur: [0,40], radius: [0,24], ideSurfaceOpacity: [0,100], ideBlur: [0,40] };
const imageTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const MAX_IMAGE = 8 * 1024 * 1024;
const ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,47}$/;

// Only known fields survive; values are interpolated into CSS, so every one is type/range checked.
export function validateTheme(input, id) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid skin format');
  if ((input.schemaVersion ?? 1) !== 1) throw new Error('Unsupported schemaVersion');
  if (!ID.test(id)) throw new Error('Skin IDs may contain letters, digits and hyphens, and must not start with a hyphen');
  const result = { id };
  for (const key of Object.keys(defaults)) result[key] = input[key] ?? defaults[key];
  // IDE panes default to the shared values, so skins without these fields look the same as before.
  for (const [key, base] of Object.entries(ideFallback)) result[key] = input[key] ?? result[base];
  if (typeof result.name !== 'string' || !result.name.trim() || result.name.length > 40) throw new Error('name must be 1-40 characters');
  if (!['dark','light'].includes(result.mode)) throw new Error('mode must be dark or light');
  if (typeof result.image !== 'string' || path.basename(result.image) !== result.image || !imageTypes[path.extname(result.image).toLowerCase()]) throw new Error('image must be a jpg/png/webp file name inside the skin folder');
  for (const [key, [min,max]] of Object.entries(ranges)) {
    if (!Number.isFinite(result[key]) || result[key] < min || result[key] > max) throw new Error(`${key} must be between ${min} and ${max}`);
  }
  for (const key of ['accent','text','muted','background','surface']) if (!/^#[\da-f]{6}$/i.test(result[key])) throw new Error(`${key} must be #rrggbb`);
  return result;
}

export async function listThemes() {
  const entries = await fs.readdir(themesRoot, { withFileTypes: true }).catch(() => []);
  const themes = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !ID.test(entry.name)) continue;
    try { themes.push({ id: entry.name, name: (await loadTheme(entry.name, { image: false })).theme.name }); }
    catch (error) { themes.push({ id: entry.name, name: entry.name, error: error.message }); }
  }
  return themes;
}

// Reads from disk on every call so edits to theme.json or the image apply without restarting.
export async function loadTheme(id, { image = true } = {}) {
  if (!ID.test(id)) throw new Error('Invalid skin ID');
  const dir = path.join(themesRoot, id);
  let raw;
  try { raw = JSON.parse(await fs.readFile(path.join(dir, 'theme.json'), 'utf8')); }
  catch (error) { throw new Error(`Cannot read themes/${id}/theme.json: ${error.message}`); }
  const theme = validateTheme(raw, id);
  if (!image) return { theme };
  const file = path.join(dir, theme.image);
  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.isFile()) throw new Error(`Missing background image themes/${id}/${theme.image}`);
  if (stat.size > MAX_IMAGE) throw new Error('Background image must not exceed 8MB');
  const bytes = await fs.readFile(file);
  return { theme, bytes, dataUrl: `data:${imageTypes[path.extname(file).toLowerCase()]};base64,${bytes.toString('base64')}` };
}
