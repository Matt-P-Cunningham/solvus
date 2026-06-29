const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  exportCSV: (data) => ipcRenderer.invoke('export-csv', data),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (event, action, payload) => callback(action, payload)),
});
