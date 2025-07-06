import {contextBridge, ipcRenderer} from 'electron';
import {Settings} from "../types/settings";
import {mapAndModeChanged} from "../types/global";
import {PogoLevel} from "../types/pogo-index-mapping";

contextBridge.exposeInMainWorld('electronAPI', {
    saveSettings: (settings: Settings) => ipcRenderer.invoke('save-settings', settings),
    loadSettings: (): Promise<Settings> => ipcRenderer.invoke('load-settings'),
    getMappings: (): Promise<PogoLevel[]> => ipcRenderer.invoke('get-mappings'),
    onMapOrModeChanged: (callback: (event: Electron.IpcRendererEvent, mapAndMode: mapAndModeChanged) => void) => ipcRenderer.on('map-or-mode-changed', callback),
    onSplitPassed: (callback: (event: Electron.IpcRendererEvent, splitInfo: { splitIndex: number, splitTime: number, splitDiff: number, golden: boolean}) => void) => ipcRenderer.on('split-passed', callback),
    onGoldenSplitPassed: (callback: (event: Electron.IpcRendererEvent, sumOfBest: number) => void) => ipcRenderer.on('golden-split-passed', callback),

    onOptionHideSkippedSplitsChanged: (hideSkippedSplits: boolean) => ipcRenderer.invoke('option-hide-skipped-splits-changed', hideSkippedSplits),
    onOptionShowNewSplitNamesChanged: (showNewSplitNames: boolean) => ipcRenderer.invoke('option-show-new-split-names-changed', showNewSplitNames),

    onSteamUserDataPathChanged: (steamUserDataPath: string) => ipcRenderer.invoke('steam-user-data-path-changed', steamUserDataPath),
    onPogostuckConfigPathChanged: (pogostuckConfigPath: string) => ipcRenderer.invoke('pogostuck-config-path-changed', pogostuckConfigPath),

    onSkipSplitsChanged: (skippedSplits: {mode:number, skippedSplitIndices: number[]}[]) => ipcRenderer.invoke('skip-splits-changed', skippedSplits),

});