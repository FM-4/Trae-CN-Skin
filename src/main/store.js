import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaults, validateTheme } from '../shared/theme.js';
export class Store {
  constructor(directory) { this.file = path.join(directory, 'settings.json'); }
  async read() {
    try {
      const data = JSON.parse(await fs.readFile(this.file, 'utf8'));
      return { theme: validateTheme(data.theme), executable: typeof data.executable === 'string' ? data.executable : '', port: 9341 };
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('本地配置无法读取，请先备份或修复 settings.json。' + error.message);
      return { theme: { ...defaults }, executable: '', port: 9341 };
    }
  }
  async write(data) {
    const value = { theme: validateTheme(data.theme), executable: data.executable, port: 9341 };
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const temp = this.file + '.' + randomUUID() + '.tmp';
    try { await fs.writeFile(temp, JSON.stringify(value, null, 2), 'utf8'); await fs.rename(temp, this.file); }
    finally { await fs.rm(temp, { force: true }).catch(() => {}); }
    return value;
  }
}
