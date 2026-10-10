import { promises as fs } from 'node:fs';
import path from 'node:path';
export async function validateExecutable(executable) {
  if (typeof executable !== 'string' || !path.isAbsolute(executable) || path.basename(executable).toLowerCase() !== 'trae cn.exe') throw new Error('请选择 TRAE CN.exe');
  const resolved = await fs.realpath(executable);
  if (!(await fs.stat(resolved)).isFile()) throw new Error('客户端路径不是文件');
  await fs.access(path.join(path.dirname(resolved), 'resources/app/out/vs/code/electron-browser/solo/solo-lite.html'));
  return resolved;
}
export async function discover(saved) {
  const roots = ['D:/SoftWare/Trae CN', 'D:/Program Files/Trae CN', path.join(process.env.LOCALAPPDATA || '', 'Programs/Trae CN'), path.join(process.env.ProgramFiles || 'C:/Program Files', 'Trae CN')];
  const candidates = [saved, ...roots.map(root => path.join(root, 'Trae CN.exe'))].filter(Boolean);
  for (const candidate of candidates) { try { return await validateExecutable(candidate); } catch {} }
  return '';
}
