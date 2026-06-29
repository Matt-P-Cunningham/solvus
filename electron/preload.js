const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow:      ()       => ipcRenderer.invoke('close-window'),
  minimizeWindow:   ()       => ipcRenderer.invoke('minimize-window'),
  toggleFullscreen: ()       => ipcRenderer.invoke('toggle-fullscreen'),
  saveData:       (data)   => ipcRenderer.invoke('save-data', data),
  exportCSV:      (args)   => ipcRenderer.invoke('export-csv', args),
  saveRecipeFile: (args)   => ipcRenderer.invoke('save-recipe-file', args),
  openRecipeFile: ()       => ipcRenderer.invoke('open-recipe-file'),
  onMenuSave:     (cb)     => ipcRenderer.on('menu-save', cb),
  onLoadRecipe:   (cb)     => ipcRenderer.on('load-recipe', (_, d) => cb(d)),
});
