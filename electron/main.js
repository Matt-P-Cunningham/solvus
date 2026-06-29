const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs   = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Data file lives in the OS user-data folder — survives app updates
function getDataPath() {
  return path.join(app.getPath('userData'), 'ferticalc-data.json');
}

function readData() {
  try {
    const p = getDataPath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {}
  return { recipes: {}, products: [] };
}

function writeData(data) {
  try { fs.writeFileSync(getDataPath(), JSON.stringify(data, null, 2)); return true; }
  catch { return false; }
}

// ─── IPC handlers ─────────────────────────────────────────────
ipcMain.handle('close-window',      (e) => BrowserWindow.fromWebContents(e.sender).close());
ipcMain.handle('minimize-window',   (e) => BrowserWindow.fromWebContents(e.sender).minimize());
ipcMain.handle('toggle-fullscreen', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win.setFullScreen(!win.isFullScreen());
});
ipcMain.handle('load-data',  ()       => readData());
ipcMain.handle('save-data',  (_, d)   => writeData(d));

ipcMain.handle('export-csv', async (_, { csv, name }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: name + '.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (canceled) return false;
  fs.writeFileSync(filePath, csv);
  return true;
});

ipcMain.handle('save-recipe-file', async (_, { data, name }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: name + '.nfr',
    filters: [{ name: 'FertiCalc Recipe', extensions: ['nfr'] }],
  });
  if (canceled) return false;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return true;
});

ipcMain.handle('open-recipe-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'FertiCalc Recipe', extensions: ['nfr', 'json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return null;
  try { return JSON.parse(fs.readFileSync(filePaths[0], 'utf-8')); }
  catch { return null; }
});

// ─── Window ───────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1400, height: 900,
    minWidth: 1100, minHeight: 700,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#f2f4f7',
    show: false,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, '../build/index.html'));
  }

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'Open Recipe…', accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const data = await ipcMain.emit('open-recipe-file');
            if (data) win.webContents.send('load-recipe', data);
          }
        },
        { label: 'Save Recipe', accelerator: 'CmdOrCtrl+S',
          click: () => win.webContents.send('menu-save') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { label: 'View', submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ]},
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
