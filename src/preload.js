const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    log: (message) => ipcRenderer.send('log-to-terminal', message),
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory')
});