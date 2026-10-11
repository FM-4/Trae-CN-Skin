import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export async function validateExecutable(executable) {
  if (typeof executable !== 'string' || !path.isAbsolute(executable) || path.basename(executable).toLowerCase() !== 'trae cn.exe') throw new Error('A full path to Trae CN.exe is required');
  const resolved = await fs.realpath(executable);
  if (!(await fs.stat(resolved)).isFile()) throw new Error('The client path is not a file');
  await fs.access(path.join(path.dirname(resolved), 'resources/app/out/vs/code/electron-browser/solo/solo-lite.html'));
  return resolved;
}

// start.ps1 passes the path it read from the installer's registry entry; direct CLI use reads the same entry.
export async function discover() {
  if (process.env.TRAE_CN_EXE) return validateExecutable(process.env.TRAE_CN_EXE);
  const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{98EB0EF0-1DE3-4838-B14A-3B0DC4570E8B}_is1';
  let output = '';
  try { output = execFileSync('reg', ['query', key, '/v', 'InstallLocation'], { encoding: 'utf8', windowsHide: true }); } catch {}
  const location = output.match(/InstallLocation\s+REG_SZ\s+(.+)/)?.[1]?.trim();
  if (!location) throw new Error('TRAE CN installation not found in the registry');
  return validateExecutable(path.join(location, 'Trae CN.exe'));
}
