export const defaults = Object.freeze({
  schemaVersion: 1, id: 'snow-ink', name: '雪墨', mode: 'dark',
  image: 'reference', focusX: 76, focusY: 42, imageWidth: 52,
  intensity: 36, taskIntensity: 15, surfaceOpacity: 68, blur: 12,
  radius: 14, accent: '#c8d7df', text: '#eceff1', muted: '#a5aab2',
  background: '#141518', surface: '#23252a'
});
export const presets = {
  'snow-ink': { ...defaults },
  'quiet-night': { ...defaults, id: 'quiet-night', name: '静夜', intensity: 18, taskIntensity: 7, surfaceOpacity: 74, blur: 6 },
  'silver-paper': { ...defaults, id: 'silver-paper', name: '银笺', mode: 'light', background: '#e8e9e7', surface: '#f6f6f3', text: '#25282c', muted: '#626873', accent: '#4e6473', intensity: 22, taskIntensity: 9, surfaceOpacity: 78 }
};
const ranges = { focusX: [0,100], focusY: [0,100], imageWidth: [30,80], intensity: [0,70], taskIntensity: [0,50], surfaceOpacity: [65,100], blur: [0,24], radius: [0,24] };
export function validateTheme(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('主题格式无效');
  if (input.schemaVersion !== 1) throw new Error('不支持此主题版本');
  const result = {};
  for (const key of Object.keys(defaults)) result[key] = input[key] ?? defaults[key];
  if (!/^[a-z0-9-]{1,48}$/.test(result.id)) throw new Error('主题 ID 无效');
  if (typeof result.name !== 'string' || !result.name.trim() || result.name.length > 40) throw new Error('主题名称无效');
  if (!['dark','light'].includes(result.mode) || result.image !== 'reference') throw new Error('主题模式或素材无效');
  for (const [key, [min,max]] of Object.entries(ranges)) {
    if (!Number.isFinite(result[key]) || result[key] < min || result[key] > max) throw new Error(`${key} 超出范围`);
  }
  for (const key of ['accent','text','muted','background','surface']) if (!/^#[\da-f]{6}$/i.test(result[key])) throw new Error(`${key} 必须为十六进制颜色`);
  return result;
}
