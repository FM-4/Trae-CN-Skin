import WebSocket from 'ws';
export async function targets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1800), redirect: 'error' });
  if (!response.ok) throw new Error('调试端口响应异常');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('调试端口不是预期的 CDP 服务');
  return data;
}
export class Session {
  constructor(socket) {
    this.socket = socket; this.next = 0; this.pending = new Map();
    socket.on('message', bytes => {
      let message; try { message = JSON.parse(bytes.toString()); } catch { return; }
      const entry = this.pending.get(message.id); if (!entry) return;
      clearTimeout(entry.timer); this.pending.delete(message.id);
      message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result);
    });
    const fail = () => { for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('TRAE CN 调试连接已断开')); } this.pending.clear(); };
    socket.on('close', fail); socket.on('error', fail);
  }
  static async open(address, port) {
    const url = new URL(address);
    if (url.protocol !== 'ws:' || !['127.0.0.1','localhost'].includes(url.hostname) || Number(url.port) !== port || url.username || url.password) throw new Error('拒绝非本机调试地址');
    const socket = new WebSocket(url, { handshakeTimeout: 2500, maxPayload: 16 * 1024 * 1024 });
    await new Promise((resolve,reject) => { socket.once('open', resolve); socket.once('error', reject); });
    return new Session(socket);
  }
  send(method, params = {}) {
    return new Promise((resolve,reject) => {
      const id = ++this.next;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`调试请求超时：${method}`)); }, 5000);
      this.pending.set(id, { resolve,reject,timer });
      this.socket.send(JSON.stringify({ id, method, params }), error => {
        if (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
      });
    });
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || '页面脚本执行失败');
    return result.result?.value;
  }
  close() { this.socket.close(); }
}
