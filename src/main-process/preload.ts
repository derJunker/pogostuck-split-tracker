import {contextBridge, ipcRenderer} from 'electron';
import {Settings} from "../types/settings";

contextBridge.exposeInMainWorld('electronAPI', {
    openSettingsWindow: () => ipcRenderer.send('open-settings'),
    saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
    loadSettings: (): Promise<Settings> => ipcRenderer.invoke('load-settings'),
    onMapOrModeChanged: (callback: (event: Electron.IpcRendererEvent, mapAndMode: { map: string; mode: string; splits: { name: string; split: number; time: number }[] }) => void) => ipcRenderer.on('map-or-mode-changed', callback),
    onSplitPassed: (callback: (event: Electron.IpcRendererEvent, splitInfo: { splitIndex: number, splitTime: number, splitDiff: number}) => void) => ipcRenderer.on('split-passed', callback),
});