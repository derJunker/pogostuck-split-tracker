import {contextBridge, ipcRenderer} from 'electron';
import {Settings} from "../types/settings";
import {mapAndModeChanged} from "../types/global";
import {PogoLevel} from "../types/pogo-index-mapping";
import IpcRendererEvent = Electron.IpcRendererEvent;

contextBridge.exposeInMainWorld('electronAPI', {
    loadSettings: (): Promise<Settings> => ipcRenderer.invoke('load-settings'),
    getMappings: (): Promise<PogoLevel[]> => ipcRenderer.invoke('get-mappings'),
    getPbs: (): Promise<{mode: number, time: number}[]> => ipcRenderer.invoke('get-pbs'),
    onMapOrModeChanged: (callback: (event: IpcRendererEvent, mapAndMode: mapAndModeChanged) => void) => ipcRenderer.on('map-or-mode-changed', callback),
    mainMenuOpened: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('main-menu-opened', callback),
    onSplitPassed: (callback: (event: Electron.IpcRendererEvent, splitInfo: { splitIndex: number, splitTime: number, splitDiff: number, golden: boolean}) => void) => ipcRenderer.on('split-passed', callback),
    onGoldenSplitPassed: (callback: (event: Electron.IpcRendererEvent, sumOfBest: number) => void) => {
        ipcRenderer.on('golden-split-passed', callback)
    },
    onStatusChanged: (callback: (event: IpcRendererEvent, statusMsg: string) => void) => {
        ipcRenderer.on('status-changed', callback);
    },

    onOptionHideSkippedSplitsChanged: (hideSkippedSplits: boolean) => ipcRenderer.invoke('option-hide-skipped-splits-changed', hideSkippedSplits),
    onOptionShowNewSplitNamesChanged: (showNewSplitNames: boolean) => ipcRenderer.invoke('option-show-new-split-names-changed', showNewSplitNames),

    onSteamUserDataPathChanged: (steamUserDataPath: string) => ipcRenderer.invoke('steam-user-data-path-changed', steamUserDataPath),
    onPogostuckConfigPathChanged: (pogostuckConfigPath: string) => ipcRenderer.invoke('pogostuck-config-path-changed', pogostuckConfigPath),

    onSkipSplitsChanged: (skippedSplits: {mode:number, skippedSplitIndices: number[]}) => ipcRenderer.invoke('skip-splits-changed', skippedSplits),
    onPbEntered: (modeAndTime: {mode: number, time: number}) => ipcRenderer.invoke('pb-entered', modeAndTime),

    isWindows11: (): Promise<boolean> => ipcRenderer.invoke('is-windows-11'),
    openWindowsSettings: (): Promise<void> => ipcRenderer.invoke('open-windows-settings'),

    openPogostuck: (): Promise<boolean> => ipcRenderer.invoke('open-pogostuck'),

});