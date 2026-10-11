import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Local state shared by start / stop; not part of the repository.
export const stateDir = path.join(process.env.APPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Roaming'), 'trae-work-skin');
export const watcherFile = path.join(stateDir, 'watcher.pid');
export const watcherLog = path.join(stateDir, 'watcher.log');
const configFile = path.join(stateDir, 'config.json');

export async function readConfig() {
  try {
    const data = JSON.parse(await fs.readFile(configFile, 'utf8'));
    return { theme: typeof data.theme === 'string' ? data.theme : 'SUBARU-Dark' };
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Cannot read config ' + configFile + ': ' + error.message);
    return { theme: 'SUBARU-Dark' };
  }
}
export async function writeConfig(patch) {
  const value = { ...(await readConfig()), ...patch };
  await fs.mkdir(stateDir, { recursive: true });
  const temp = configFile + '.' + randomUUID() + '.tmp';
  try { await fs.writeFile(temp, JSON.stringify(value, null, 2), 'utf8'); await fs.rename(temp, configFile); }
  finally { await fs.rm(temp, { force: true }).catch(() => {}); }
  return value;
}
