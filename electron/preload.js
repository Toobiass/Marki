const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    log: (msg) => ipcRenderer.send('log-to-terminal', msg),
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
    openFile: () => ipcRenderer.invoke('file:open'),
    saveFile: (data) => ipcRenderer.invoke('file:save', data),
    getRecentFiles: () => ipcRenderer.invoke('file:get-recents'),
    readFilePath: (path) => ipcRenderer.invoke('file:read-path', path),
    getSettings: () => ipcRenderer.invoke('settings:get'),
    setSetting: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
    setNativeTheme: (theme) => ipcRenderer.send('theme:set-native', theme),
});