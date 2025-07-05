import {contextBridge, ipcRenderer} from 'electron';
import {Settings} from "../types/settings";
import {mapAndModeChanged} from "../types/global";

contextBridge.exposeInMainWorld('electronAPI', {
    openSettingsWindow: () => ipcRenderer.send('open-settings'),
    saveSettings: (settings: Settings) => ipcRenderer.invoke('save-settings', settings),
    loadSettings: (): Promise<Settings> => ipcRenderer.invoke('load-settings'),
    onMapOrModeChanged: (callback: (event: Electron.IpcRendererEvent, mapAndMode: mapAndModeChanged) => void) => ipcRenderer.on('map-or-mode-changed', callback),
    onSplitPassed: (callback: (event: Electron.IpcRendererEvent, splitInfo: { splitIndex: number, splitTime: number, splitDiff: number, golden: boolean}) => void) => ipcRenderer.on('split-passed', callback),
    onGoldenSplitPassed: (callback: (event: Electron.IpcRendererEvent, sumOfBest: number) => void) => ipcRenderer.on('golden-split-passed', callback),
});