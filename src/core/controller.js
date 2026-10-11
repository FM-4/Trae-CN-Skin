import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { targets, Session } from './cdp.js';
import { validateExecutable } from './discovery.js';
import { loadTheme, listThemes } from './theme.js';

// Fresh module URLs make edits to inject.js / adapter.js take effect on the next apply without restarting.
async function runtime() {
  const stamp = Date.now();
  const [{ installTheme }, { adapter }] = await Promise.all([import(`./inject.js?t=${stamp}`), import(`./adapter.js?t=${stamp}`)]);
  return { installTheme, adapter };
}
const pageMode = value => value === 'light' ? 'light' : value === 'dark' || value === 'dark-blue' ? 'dark' : null;

export class Controller {
  constructor(onStatus = () => {}) {
    this.port = 9341; this.onStatus = onStatus; this.active = null; this.timer = null; this.payloads = new Map();
    this.owner = Date.now();
    this.busy = false; this.status = { phase:'idle', message:'Not connected to TRAE CN', windows:[] };
  }
  report(phase, message, windows = []) { this.status = { phase,message,windows }; this.onStatus(this.status); return this.status; }
  async exclusive(action) {
    if (this.busy) throw new Error('The previous operation is still running');
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
  // One skin per TRAE mode: the preferred skin when it fits, otherwise the first valid skin made for that mode.
  async pick(mode, preferred) {
    const valid = [];
    for (const { id, error } of await listThemes()) {
      if (error) continue;
      try { valid.push((await loadTheme(id, { image:false })).theme); } catch {}
    }
    if (!valid.length) throw new Error('No valid skins in themes/');
    return valid.find(theme => theme.id === preferred && theme.mode === mode) ?? valid.find(theme => theme.mode === mode) ?? null;
  }
  async payload(id) {
    const { theme, bytes, dataUrl } = await loadTheme(id);
    const { installTheme, adapter } = await runtime();
    const source = installTheme.toString();
    const revision = createHash('sha256').update(JSON.stringify(theme)).update(JSON.stringify(adapter)).update(source).update(bytes).digest('hex').slice(0,20);
    return { theme, image:dataUrl, revision, source, adapter };
  }
  expression(payload) { return `(() => { const result = (${payload.source})(${JSON.stringify(payload.theme)},${JSON.stringify(payload.image)},${JSON.stringify(payload.adapter)},${JSON.stringify(payload.revision)}); window.__traeSnowInkOwner = ${this.owner}; return result; })()`; }
  async inject(target, payload) {
    return this.withTarget(target, async session => {
      const result = await session.evaluate(this.expression(payload));
      if (!result?.installed || result.revision !== payload.revision) throw new Error('Could not confirm the injected style is mounted');
      const imageLoaded = await session.evaluate(`new Promise(resolve => { const image=new Image(); const timer=setTimeout(()=>resolve(false),3000); image.onload=()=>{clearTimeout(timer);resolve(image.naturalWidth>0)}; image.onerror=()=>{clearTimeout(timer);resolve(false)}; image.src=${JSON.stringify(payload.image)}; })`);
      if (!imageLoaded) throw new Error('Skin background image failed to load');
      return { id:target.id, ...result };
    });
  }
  // Brings every workbench window in line with TRAE's current light/dark mode. Never touches TRAE settings.
  async sync(list, preferred) {
    const windows = [];
    for (const target of list) {
      const state = await this.withTarget(target,session => session.evaluate('({ mode:document.documentElement.getAttribute("data-theme"), skin:window.__traeSnowInkV1 ? { ...window.__traeSnowInkV1.inspect(), owner:window.__traeSnowInkOwner ?? 0 } : null })'));
      // A later instance (e.g. a re-run of start.bat with new code) owns this window; yield instead of reverting it.
      if (state.skin?.installed && state.skin.owner > this.owner) return { yielded:true };
      const mode = pageMode(state.mode);
      const theme = mode ? await this.pick(mode, preferred) : null;
      if (!theme) {
        if (state.skin) await this.remove(target);
        windows.push({ id:target.id, mode:state.mode, theme:null });
        continue;
      }
      let payload = this.payloads.get(theme.id);
      if (!payload) { payload = await this.payload(theme.id); this.payloads.set(theme.id, payload); }
      const current = state.skin?.installed && state.skin.revision === payload.revision;
      windows.push({ ...(current ? { id:target.id, ...state.skin } : await this.inject(target,payload)), mode:state.mode, theme });
    }
    return { windows };
  }
  describe(windows) {
    const skinned = windows.filter(w => w.theme);
    if (!skinned.length) return { phase:'idle', message:`TRAE CN is in ${windows[0]?.mode ?? 'an unknown'} mode with no matching skin; injection removed` };
    const names = [...new Set(skinned.map(w => w.theme.name))].join(', ');
    const full = skinned.every(w => w.level === 'full');
    return { phase: full ? 'applied' : 'partial', message: full ? `Applied ${names}` : `Applied ${names}; some components did not match` };
  }
  async apply(executable, preferred) {
    return this.exclusive(async () => {
      const list = await this.matching(executable);
      if (!list.length) throw new Error('TRAE CN Agent workbench not found; start TRAE CN first');
      clearInterval(this.timer); this.timer = null;
      // Theme files and injection code are re-read on every apply, so edits take effect immediately.
      this.payloads = new Map();
      this.report('applying','Applying the skin for the current TRAE CN light/dark mode...');
      const result = await this.sync(list, preferred);
      if (result.yielded) return this.report('idle','A newer instance has taken over TRAE CN');
      this.active = { executable, preferred }; this.watch();
      const { phase, message } = this.describe(result.windows);
      return this.report(phase, message, result.windows);
    });
  }
  watch() {
    clearInterval(this.timer);
    this.timer = setInterval(async () => {
      if (this.busy || !this.active) return;
      this.busy = true;
      try {
        const list = await this.matching(this.active.executable);
        if (!list.length) { this.report('waiting','Waiting for the TRAE CN Agent workbench to reappear'); return; }
        const result = await this.sync(list, this.active.preferred);
        if (result.yielded) {
          clearInterval(this.timer); this.timer = null; this.active = null;
          this.report('idle','A newer instance has taken over TRAE CN; this watcher stopped');
          return;
        }
        const { phase, message } = this.describe(result.windows);
        this.report(phase, message, result.windows);
      } catch { this.report('waiting','Connection unavailable; waiting to reconnect'); }
      finally { this.busy = false; }
    },3000);
  }
  async remove(target) {
    return this.withTarget(target, async session => {
      const removed = await session.evaluate(`(() => { window.__traeSnowInkV1?.dispose(); delete window.__traeSnowInkOwner; return !window.__traeSnowInkV1 && !document.getElementById('trae-snow-ink-style') && !document.getElementById('trae-snow-ink-background'); })()`);
      if (!removed) throw new Error('Could not confirm the native look was restored');
    });
  }
  async restore(executable) {
    return this.exclusive(async () => {
      clearInterval(this.timer); this.timer = null; this.active = null;
      const list = await this.matching(executable);
      if (!list.length) throw new Error('Watcher stopped, but no TRAE CN window is reachable to confirm removal. The skin disappears when TRAE CN fully exits.');
      const failures = [];
      for (const target of list) { try { await this.remove(target); } catch { failures.push(target.id); } }
      if (failures.length) throw new Error(`Removal not confirmed in ${failures.length} window(s); watcher stopped`);
      return this.report('restored','Skin removed; TRAE CN is back to its native look');
    });
  }
  // Reads what is actually on the page: injected revision/theme, TRAE mode, light blocks and low-contrast text.
  async check(executable) {
    const list = await this.matching(executable);
    if (!list.length) throw new Error('TRAE CN Agent workbench not found');
    const results = [];
    for (const target of list) results.push(await this.withTarget(target,session => session.evaluate(CHECK_SCRIPT,15000)));
    return results;
  }
  stop() { clearInterval(this.timer); this.timer = null; }
}

const CHECK_SCRIPT = String.raw`(() => {
  const ctx = document.createElement('canvas').getContext('2d');
  const rgba = c => { ctx.clearRect(0,0,1,1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
  const lum = ([r,g,b]) => { const f = v => { v /= 255; return v <= .03928 ? v/12.92 : ((v+.055)/1.055) ** 2.4; }; return .2126*f(r)+.7152*f(g)+.0722*f(b); };
  const state = window.__traeSnowInkV1, dark = (state?.theme?.mode ?? document.documentElement.getAttribute('data-theme')) !== 'light';
  const fallback = rgba(getComputedStyle(document.body).backgroundColor);
  const bgOf = el => { for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 200) return c; } return fallback; };
  const label = el => (el.className.toString().split(' ').filter(Boolean)[0] || el.tagName.toLowerCase()) + ' "' + el.textContent.trim().slice(0, 16) + '"';
  const blocks = new Set(), contrast = new Set();
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const bg = rgba(cs.backgroundColor);
    // In a dark theme an opaque near-white box is almost always an unthemed component.
    if (dark && bg[3] > 100 && lum(bg) > .6 && r.width * r.height > 400) blocks.add(label(el));
    if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
      const a = lum(rgba(cs.color)), b = lum(bgOf(el)), ratio = (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      if (ratio < 3) contrast.add(label(el) + ' ' + ratio.toFixed(2));
    }
  }
  return { url: location.pathname.split('/').slice(-2).join('/'), revision: state?.revision ?? null, theme: state?.theme?.id ?? null, enabled: state?.inspect().enabled ?? null, level: state?.inspect().level ?? null, mode: document.documentElement.getAttribute('data-theme'), lightBlocks: [...blocks].slice(0, 20), lowContrast: [...contrast].slice(0, 20) };
})()`;
