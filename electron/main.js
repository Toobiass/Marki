const fs = require('fs');
const { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme } = require('electron');
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
    win.loadFile(path.join(__dirname, '../dist/marki/browser/index.html'));
}

function addRecentFile(filePath) {
    let recents = store.get('recent-files') || [];
    recents = [filePath, ...recents.filter(r => r !== filePath)];
    store.set('recent-files', recents.slice(0, 6));
}

ipcMain.on('log-to-terminal', (event, message) => {
    console.log("Log:", message);
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

ipcMain.handle('file:open', async () => {
    const defaultDir = store.get('standard-folder') || app.getPath('documents');

    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Open Markdown File',
        defaultPath: defaultDir,
        properties: ['openFile'],
        filters: [{ name: 'Markdown', extensions: ['md'] }]
    });

    if (canceled || !filePaths || filePaths.length === 0) return null;

    const filePath = filePaths[0];
    if (!filePath.toLowerCase().endsWith('.md')) return null;

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        addRecentFile(filePath);
        return { filePath, content };
    } catch (err) {
        console.error('Open failed:', err);
        return null;
    }
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
        addRecentFile(savePath);
        return { success: true, filePath: savePath };
    } catch (err) {
        console.error("Save failed:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('file:get-recents', () => store.get('recent-files') || []);


ipcMain.handle('file:read-path', async (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        addRecentFile(filePath); // Auch beim direkten Öffnen tracken
        return { filePath, content };
    } catch (err) { return null; }
});

ipcMain.handle('settings:get', (event) => {
    return {
        standardFolder: store.get('standard-folder') || '',
        theme: store.get('theme') || 'dark',
    };
});

ipcMain.handle('settings:set', (event, { key, value }) => {
    store.set(key, value);
    return true;
});

ipcMain.on('theme:set-native', (event, theme) => {
    nativeTheme.themeSource = theme;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});