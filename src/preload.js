const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    log: (msg) => ipcRenderer.send('log-to-terminal', msg),
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
    saveFile: (data) => ipcRenderer.invoke('file:save', data)
});