// Uses the WebSocket built into Node 22+ / Electron 38+, so no runtime dependency is needed.
export async function targets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1800), redirect: 'error' });
  if (!response.ok) throw new Error('Unexpected response from the debug port');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('The debug port is not a CDP endpoint');
  return data;
}
export class Session {
  constructor(socket) {
    this.socket = socket; this.next = 0; this.pending = new Map();
    socket.addEventListener('message', event => {
      let message; try { message = JSON.parse(String(event.data)); } catch { return; }
      const entry = this.pending.get(message.id); if (!entry) return;
      clearTimeout(entry.timer); this.pending.delete(message.id);
      message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result);
    });
    const fail = () => { for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('TRAE CN debug connection closed')); } this.pending.clear(); };
    socket.addEventListener('close', fail); socket.addEventListener('error', fail);
  }
  static async open(address, port) {
    const url = new URL(address);
    if (url.protocol !== 'ws:' || !['127.0.0.1','localhost'].includes(url.hostname) || Number(url.port) !== port || url.username || url.password) throw new Error('Refusing non-loopback debug address');
    const socket = new WebSocket(url);
    await new Promise((resolve,reject) => {
      const timer = setTimeout(() => { socket.close(); reject(new Error('Debug connection timed out')); }, 2500);
      socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Cannot connect to the TRAE CN debug port')); }, { once: true });
    });
    return new Session(socket);
  }
  send(method, params = {}, timeout = 5000) {
    return new Promise((resolve,reject) => {
      const id = ++this.next;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Debug request timed out: ${method}`)); }, timeout);
      this.pending.set(id, { resolve,reject,timer });
      try { this.socket.send(JSON.stringify({ id, method, params })); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
  async evaluate(expression, timeout) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, timeout);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Page script failed');
    return result.result?.value;
  }
  close() { this.socket.close(); }
}
