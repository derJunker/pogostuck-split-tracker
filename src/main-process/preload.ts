import {contextBridge, ipcRenderer} from 'electron';
import {Settings} from "../types/settings";

contextBridge.exposeInMainWorld('electronAPI', {
    openSettingsWindow: () => ipcRenderer.send('open-settings'),
    saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
    loadSettings: (): Promise<Settings> => ipcRenderer.invoke('load-settings')
});