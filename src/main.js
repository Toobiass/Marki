const fs = require('fs');
const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const packageInfo = require('../package.json');
const Store = require('electron-store');
const store = new (Store.default || Store)();

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

    if (!canceled && filePaths.length > 0) {
        const selectedPath = filePaths[0];
        store.set('standard-folder', selectedPath); // Persistent save
        return selectedPath;
    }
    return null;
});

ipcMain.handle('file:save', async (event, { content, existingPath, suggestedName }) => {
    let savePath = existingPath;

    if (!savePath) {
        const defaultDir = store.get('standard-folder') || app.getPath('documents');

        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Save Markdown File',
            defaultPath: path.join(defaultDir, `${suggestedName}.md`),
            filters: [{ name: 'Markdown', extensions: ['md'] }]
        });

        if (canceled) return { success: false };
        savePath = filePath;
    }

    try {
        fs.writeFileSync(savePath, content, 'utf8');
        return { success: true, filePath: savePath };
    } catch (err) {
        console.error("Save failed:", err);
        return { success: false, error: err.message };
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});