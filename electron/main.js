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
        icon: path.join(__dirname, '../assets/logo.png'),
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
    const isFirstSave = !existingPath;
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

        if (isFirstSave) {
            const targetDir = path.dirname(savePath);
            const standardDir = store.get('standard-folder') || app.getPath('documents');

            if (targetDir !== standardDir) {
                const imageRegex = /!\[alt text\]\((image_\d{4}-\d{2}-\d{2}T[^)]+\.png)\)/g;
                let match;
                while ((match = imageRegex.exec(content)) !== null) {
                    const imageName = match[1];
                    const sourcePath = path.join(standardDir, imageName);
                    const destPath = path.join(targetDir, imageName);

                    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
                        try {
                            fs.copyFileSync(sourcePath, destPath);
                            console.log(`Migrated image: ${imageName} to ${targetDir}`);
                        } catch (copyErr) {
                            console.error(`Failed to migrate image ${imageName}:`, copyErr);
                        }
                    }
                }
            }
        }

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

ipcMain.handle('file:save-image', async (event, { arrayBuffer, currentFilePath }) => {
    let targetDir;

    if (currentFilePath) {
        targetDir = path.dirname(currentFilePath);
    } else {
        targetDir = store.get('standard-folder') || app.getPath('documents');
    }

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const randomStr = Math.random().toString(36).substring(2, 7);
    const fileName = `image_${timestamp}_${randomStr}.png`;
    const fullPath = path.join(targetDir, fileName);

    try {
        fs.writeFileSync(fullPath, Buffer.from(arrayBuffer));
        return { success: true, fileName, fullPath };
    } catch (err) {
        console.error("Image save failed:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('settings:get', (event) => {
    return {
        standardFolder: store.get('standard-folder') || '',
        theme: store.get('theme') || 'dark',
        userAgreementAccepted: store.get('user-agreement-accepted') || false,
    };
});

ipcMain.handle('settings:set', (event, { key, value }) => {
    store.set(key, value);
    return true;
});

ipcMain.on('theme:set-native', (event, theme) => {
    nativeTheme.themeSource = theme;
});

ipcMain.on('window:close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
});

ipcMain.handle('file:get-pdf-path', async (event, { suggestedName }) => {
    const defaultDir = store.get('standard-folder') || app.getPath('documents');
    const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export to PDF',
        defaultPath: path.join(defaultDir, `${suggestedName}.pdf`),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    return canceled ? null : filePath;
});

ipcMain.handle('file:print-to-pdf', async (event, { html, filePath }) => {
    const printWin = new BrowserWindow({
        show: false,
        webPreferences: {
            offscreen: true,
            webSecurity: false
        }
    });

    try {
        await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        await new Promise(resolve => setTimeout(resolve, 500));

        const data = await printWin.webContents.printToPDF({
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            printBackground: true,
            pageSize: 'A4'
        });

        fs.writeFileSync(filePath, data);
        return { success: true, filePath };
    } catch (err) {
        console.error('PDF generation failed:', err);
        return { success: false, error: err.message };
    } finally {
        printWin.close();
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});