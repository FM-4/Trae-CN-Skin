const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('skin', Object.freeze({
  read: () => ipcRenderer.invoke('skin:read'),
  chooseExecutable: () => ipcRenderer.invoke('skin:choose'),
  save: theme => ipcRenderer.invoke('skin:save',theme),
  apply: theme => ipcRenderer.invoke('skin:apply',theme),
  connect: () => ipcRenderer.invoke('skin:connect'),
  restore: () => ipcRenderer.invoke('skin:restore'),
  onStatus: callback => { const listener = (_,status) => callback(status); ipcRenderer.on('skin:status',listener); return () => ipcRenderer.removeListener('skin:status',listener); }
}));
