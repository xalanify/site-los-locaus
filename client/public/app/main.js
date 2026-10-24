const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 520,
    height: 340,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  win.loadFile('index.html');
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      window.api = {
        startAgent: () => {
          require('child_process').spawn('cmd', ['/c', 'start', 'ligar.bat'], { cwd: '${__dirname}/../..' });
        }
      };
    `);
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
