const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const packageInfo = require('../package.json');

try {
    require('electron-reloader')(module);
} catch { }

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        title: `Marki v${packageInfo.version}`,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            webSecurity: false
        }
    });

    Menu.setApplicationMenu(null);

    win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.on('log-to-terminal', (event, message) => {
    console.log("Renderer sagt:", message);
});

ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (!canceled) {
        return filePaths[0];
    }
});

app.whenReady().then(createWindow);