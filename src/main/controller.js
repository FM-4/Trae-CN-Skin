import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { targets, Session } from './cdp.js';
import { validateExecutable } from './discovery.js';
import { validateTheme } from '../shared/theme.js';
import { adapter } from '../runtime/adapter.js';
import { installTheme } from '../runtime/inject.js';

export class Controller {
  constructor(onStatus) {
    this.port = 9341; this.onStatus = onStatus; this.active = null; this.timer = null;
    this.busy = false; this.status = { phase:'idle', message:'尚未连接 TRAE CN', windows:[] };
  }
  report(phase, message, windows = []) { this.status = { phase,message,windows }; this.onStatus(this.status); return this.status; }
  async exclusive(action) {
    if (this.busy) throw new Error('上一项操作尚未完成');
    this.busy = true;
    try { return await action(); }
    catch (error) { if (this.status.phase !== 'error') this.report('error',error.message); throw error; }
    finally { this.busy = false; }
  }
  async matching(executable) {
    const root = path.dirname(await validateExecutable(executable)).toLowerCase();
    const list = await targets(this.port);
    return list.filter(target => {
      if (target.type !== 'page' || !target.webSocketDebuggerUrl) return false;
      try {
        const url = new URL(target.url);
        if (!['file:','vscode-file:'].includes(url.protocol) || !url.pathname.endsWith('/solo/solo-lite.html')) return false;
        const decodedPath = decodeURIComponent(url.pathname);
        const filePath = url.protocol === 'file:' ? fileURLToPath(url) : decodedPath.replace(/^\/([A-Za-z]:\/)/, '$1').replaceAll('/', path.sep);
        const file = path.resolve(filePath).toLowerCase();
        return file.startsWith(root + path.sep);
      } catch { return false; }
    });
  }
  async withTarget(target, action) {
    const session = await Session.open(target.webSocketDebuggerUrl,this.port);
    try { return await action(session); } finally { session.close(); }
  }
  async start(executable) {
    return this.exclusive(async () => {
      executable = await validateExecutable(executable);
      try {
        const list = await targets(this.port);
        if (list.length) {
          const matched = await this.matching(executable);
          if (matched.length) return this.report('connected','已找到 TRAE CN Agent 工作台');
          throw new Error('9341 端口被其他页面占用，请关闭占用后重试');
        }
        throw new Error('9341 端口已被占用，但尚无 TRAE CN Agent 工作台');
      } catch (error) {
        // Only connection refusal permits launch; malformed/foreign endpoints never do.
        if (error.cause?.code !== 'ECONNREFUSED') throw error;
      }
      this.report('connecting','正在等待 TRAE CN Agent 工作台…');
      await new Promise((resolve,reject) => {
        const child = spawn(executable,['--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${this.port}`], { detached:true, stdio:'ignore', windowsHide:true });
        child.once('error',reject); child.once('spawn',() => { child.unref(); resolve(); });
      });
      const deadline = Date.now() + 18000;
      while (Date.now() < deadline) {
        try { if ((await this.matching(executable)).length) return this.report('connected','TRAE CN 已连接，可以应用主题'); } catch {}
        await new Promise(resolve => setTimeout(resolve,700));
      }
      throw new Error('未发现 TRAE CN Agent 工作台。如果 TRAE CN 已在运行，请保存工作并手动完全退出，再使用此按钮启动。程序不会强制结束进程。');
    });
  }
  async payload(theme) {
    const bytes = await fs.readFile(new URL('../../assets/snow-ink.jpg',import.meta.url));
    const image = 'data:image/jpeg;base64,' + bytes.toString('base64');
    const revision = createHash('sha256').update(JSON.stringify(theme)).update(JSON.stringify(adapter)).update(installTheme.toString()).update(bytes).digest('hex').slice(0,20);
    return { theme,image,revision };
  }
  expression(payload) { return `(${installTheme.toString()})(${JSON.stringify(payload.theme)},${JSON.stringify(payload.image)},${JSON.stringify(adapter)},${JSON.stringify(payload.revision)})`; }
  async inject(target, payload) {
    return this.withTarget(target, async session => {
      const result = await session.evaluate(this.expression(payload));
      if (!result?.installed || result.revision !== payload.revision) throw new Error('未能确认注入样式已挂载');
      const imageLoaded = await session.evaluate(`new Promise(resolve => { const image=new Image(); const timer=setTimeout(()=>resolve(false),3000); image.onload=()=>{clearTimeout(timer);resolve(image.naturalWidth>0)}; image.onerror=()=>{clearTimeout(timer);resolve(false)}; image.src=${JSON.stringify(payload.image)}; })`);
      if (!imageLoaded) throw new Error('主题背景加载失败');
      return { id:target.id, ...result };
    });
  }
  async apply(executable, input) {
    return this.exclusive(async () => {
      const theme = validateTheme(input);
      const list = await this.matching(executable);
      if (!list.length) throw new Error('未找到 TRAE CN Agent 工作台。请先使用「连接 / 启动 TRAE CN」。');
      const payload = await this.payload(theme); const previous = this.active;
      clearInterval(this.timer); this.timer = null;
      this.report('applying','正在应用并确认主题…');
      const changed = [];
      try {
        const windows = [];
        for (const target of list) {
          const snapshot = await this.withTarget(target,session => session.evaluate(`(() => { const state=window.__traeSnowInkV1; return state ? { theme:state.theme,image:state.image,revision:state.revision } : null; })()`));
          changed.push({ target,snapshot }); windows.push(await this.inject(target,payload));
        }
        this.active = { executable,payload }; this.watch();
        return this.report(windows.every(w => w.level === 'full') ? 'applied' : 'partial', windows.every(w => w.level === 'full') ? '主题已注入；等待实机视觉验收' : '已应用基础外观，部分组件尚未匹配',windows);
      } catch (error) {
        const failures = [];
        for (const { target,snapshot } of changed) {
          try {
            if (snapshot) await this.inject(target,snapshot);
            else await this.remove(target);
          } catch { failures.push(target.id); }
        }
        this.active = previous;
        if (previous && !failures.length) this.watch();
        this.report('error', failures.length ? `应用失败；${failures.length} 个窗口回退状态未确认，请还原后重试` : '应用失败，已撤销本次变更');
        throw error;
      }
    });
  }
  watch() {
    clearInterval(this.timer);
    this.timer = setInterval(async () => {
      if (this.busy || !this.active) return;
      this.busy = true;
      try {
        const list = await this.matching(this.active.executable);
        if (!list.length) { this.report('waiting','等待 TRAE CN Agent 工作台重新出现'); return; }
        const windows = [];
        for (const target of list) {
          const state = await this.withTarget(target,session => session.evaluate('window.__traeSnowInkV1?.inspect() ?? null'));
          windows.push(state?.revision === this.active.payload.revision && state.installed ? { id:target.id,...state } : await this.inject(target,this.active.payload));
        }
        this.report(windows.every(w=>w.level === 'full') ? 'applied' : 'partial', windows.every(w=>w.level === 'full') ? '主题已注入；等待实机视觉验收' : '基础外观已应用，部分组件尚未匹配',windows);
      } catch { this.report('waiting','连接暂时不可用，等待恢复；尚未确认当前外观'); }
      finally { this.busy = false; }
    },3000);
  }
  async remove(target) {
    return this.withTarget(target, async session => {
      const removed = await session.evaluate(`(() => { window.__traeSnowInkV1?.dispose(); return !window.__traeSnowInkV1 && !document.getElementById('trae-snow-ink-style') && !document.getElementById('trae-snow-ink-background'); })()`);
      if (!removed) throw new Error('未能确认原生外观恢复');
    });
  }
  async restore(executable) {
    return this.exclusive(async () => {
      clearInterval(this.timer); this.timer = null; this.active = null;
      const list = await this.matching(executable);
      if (!list.length) throw new Error('自动补注入已停止，但无法连接 TRAE CN 窗口确认恢复。完全退出 TRAE CN 后运行时主题会清除。');
      const failures = [];
      for (const target of list) { try { await this.remove(target); } catch { failures.push(target.id); } }
      if (failures.length) throw new Error(`${failures.length} 个窗口未确认恢复，自动补注入已停止`);
      return this.report('restored','注入样式与监听器已移除，TRAE CN 已恢复原生外观');
    });
  }
  stop() { clearInterval(this.timer); this.timer = null; }
}
