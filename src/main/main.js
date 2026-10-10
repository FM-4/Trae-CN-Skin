import { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } from 'electron';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
import { discover, validateExecutable } from './discovery.js';
import { Controller } from './controller.js';
import { validateTheme } from '../shared/theme.js';

let window, tray, store, config, controller; let quitting = false;
const page = fileURLToPath(new URL('../renderer/index.html',import.meta.url));
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else {
  app.on('second-instance',() => { window?.show(); window?.focus(); });
  app.whenReady().then(async () => {
    store = new Store(app.getPath('userData'));
    config = await store.read(); config.executable = await discover(config.executable);
    controller = new Controller(status => { if (window && !window.isDestroyed()) window.webContents.send('skin:status',status); });
    const handle = (channel, callback) => ipcMain.handle(channel, async event => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('未知调用来源');
      try { return { ok:true, value:await callback() }; }
      catch (error) { return { ok:false, error:error.message }; }
    });
    handle('skin:read',() => ({ config, status:controller.status }));
    handle('skin:choose',async () => {
      const result = await dialog.showOpenDialog(window,{ title:'选择 TRAE CN 客户端', properties:['openFile'], filters:[{name:'TRAE CN 客户端',extensions:['exe']}] });
      if (result.canceled) return config.executable;
      if (controller.active || controller.busy) throw new Error('请先还原当前客户端主题，再更换安装路径');
      const executable = await validateExecutable(result.filePaths[0]);
      config = await store.write({ ...config,executable }); return executable;
    });
    handle('skin:connect',() => controller.start(config.executable));
    handle('skin:restore',() => controller.restore(config.executable));
    for (const action of ['save','apply']) ipcMain.handle('skin:'+action, async (event,input) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('未知调用来源');
      try {
        const theme = validateTheme(input);
        if (action === 'apply') return { ok:true,value:await controller.apply(config.executable,theme) };
        config = await store.write({ ...config, theme }); return { ok:true,value:config.theme };
      } catch (error) { return { ok:false,error:error.message }; }
    });
    window = new BrowserWindow({ width:1240,height:850,minWidth:940,minHeight:700,backgroundColor:'#101113',title:'雪墨 · TRAE CN Skin', autoHideMenuBar:true,
      webPreferences:{ preload:fileURLToPath(new URL('./preload.cjs',import.meta.url)), contextIsolation:true,nodeIntegration:false,sandbox:true } });
    window.webContents.setWindowOpenHandler(() => ({ action:'deny' }));
    window.webContents.on('will-navigate',event => event.preventDefault());
    window.on('close',event => { if (!quitting && tray) { event.preventDefault(); window.hide(); } });
    await window.loadFile(page);
    // Tiny generated tray glyph; no external icon or native helper required.
    const pixels = Buffer.alloc(16*16*4);
    for (let y=0;y<16;y++) for(let x=0;x<16;x++) { const offset=(y*16+x)*4; const lit=Math.abs(x-7.5)+Math.abs(y-7.5)<6; pixels[offset]=210; pixels[offset+1]=218; pixels[offset+2]=224; pixels[offset+3]=lit?255:0; }
    tray = new Tray(nativeImage.createFromBitmap(pixels,{width:16,height:16}));
    tray.setToolTip('雪墨 · TRAE CN Skin');
    tray.on('double-click',()=>window.show());
    tray.setContextMenu(Menu.buildFromTemplate([
      {label:'打开主题管理',click:()=>window.show()},
      {label:'还原 TRAE CN 外观',click:async()=>{ try { await controller.restore(config.executable); } catch(error) { dialog.showErrorBox('恢复状态未确认',error.message); } }},
      {type:'separator'}, {label:'退出管理器',click:()=>{ quitting=true;app.quit(); }}
    ]));
  }).catch(error => { dialog.showErrorBox('无法打开雪墨',error.message); app.quit(); });
  app.on('before-quit',() => { quitting=true;controller?.stop(); });
  app.on('window-all-closed',()=>{ if (!tray) app.quit(); });
}
