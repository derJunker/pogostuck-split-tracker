const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openSettings: () => ipcRenderer.send('open-settings')
});