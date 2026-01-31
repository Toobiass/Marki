const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const packageInfo = require('../package.json');

try {
    require('electron-reloader')(module);
} catch { }

function createWindow() {
    const win = new BrowserWindow({
        width: 1000, // Etwas breiter wirkt oft moderner
        height: 700,
        title: `Marki v${packageInfo.version}`,
        webPreferences: {
            // Da preload.js im GLEICHEN Ordner wie main.js liegt (beide in src):
            preload: path.join(__dirname, 'preload.js')
        }
    });

    Menu.setApplicationMenu(null);

    // Da index.html im GLEICHEN Ordner wie main.js liegt:
    win.loadFile(path.join(__dirname, 'index.html'));
}

// Höre auf den Kanal 'log-to-terminal'
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