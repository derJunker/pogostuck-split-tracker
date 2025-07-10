import {contextBridge, ipcRenderer} from 'electron';
import {Settings} from "../types/settings";
import {PbRunInfoAndSoB} from "../types/global";
import {PogoLevel} from "../types/pogo-index-mapping";
import IpcRendererEvent = Electron.IpcRendererEvent;

contextBridge.exposeInMainWorld('electronAPI', {
    // overlay querying to backend
    loadSettings: (): Promise<Settings> => ipcRenderer.invoke('load-settings'),
    getMappings: (): Promise<PogoLevel[]> => ipcRenderer.invoke('get-mappings'),
    getPbs: (): Promise<{mode: number, time: number}[]> => ipcRenderer.invoke('get-pbs'),

    // overlay subscribing to backend events
    mainMenuOpened: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('main-menu-opened', callback),
    resetOverlay: (callback: (event: IpcRendererEvent, mapAndMode: PbRunInfoAndSoB) => void) => ipcRenderer.on('reset-overlay', callback),
    redrawOverlay: (callback: (event: IpcRendererEvent, pbRunInfoAndSoB: PbRunInfoAndSoB) => void) => ipcRenderer.on('redraw-split-display', callback),
    onSplitPassed: (callback: (event: Electron.IpcRendererEvent, splitInfo: { splitIndex: number, splitTime: number, splitDiff: number, golden: boolean, onlyDiffColored: boolean}) => void) => ipcRenderer.on('split-passed', callback),
    onGoldenSplitPassed: (callback: (event: Electron.IpcRendererEvent, sumOfBest: number) => void) => ipcRenderer.on('golden-split-passed', callback),
    onStatusChanged: (callback: (event: IpcRendererEvent, statusMsg: string) => void) => ipcRenderer.on('status-changed', callback),

    // config window sending events to backend
    onOptionHideSkippedSplitsChanged: (hideSkippedSplits: boolean) => ipcRenderer.invoke('option-hide-skipped-splits-changed', hideSkippedSplits),
    onLaunchPogoOnStartupChanged: (launchPogoOnStartup: boolean) => ipcRenderer.invoke('option-launch-pogo-on-startup', launchPogoOnStartup),
    onOptionShowNewSplitNamesChanged: (showNewSplitNames: boolean) => ipcRenderer.invoke('option-show-new-split-names-changed', showNewSplitNames),
    onSteamUserDataPathChanged: (steamUserDataPath: string) => ipcRenderer.invoke('steam-user-data-path-changed', steamUserDataPath),
    onPogostuckConfigPathChanged: (pogostuckConfigPath: string) => ipcRenderer.invoke('pogostuck-config-path-changed', pogostuckConfigPath),
    onSkipSplitsChanged: (skippedSplits: {mode:number, skippedSplitIndices: number[]}) => ipcRenderer.invoke('skip-splits-changed', skippedSplits),
    onOnlyDiffColoredChanged: (onlyDiffColored: boolean) => ipcRenderer.invoke('only-diff-colored-changed', onlyDiffColored),
    onPbEntered: (modeAndTime: {mode: number, time: number}) => ipcRenderer.invoke('pb-entered', modeAndTime),
    openPogostuck: (): Promise<boolean> => ipcRenderer.invoke('open-pogostuck'),

    // config querying backend
    isWindows11: (): Promise<boolean> => ipcRenderer.invoke('is-windows-11'),
    hasPogostuckFullscreen: (): Promise<boolean> => ipcRenderer.invoke('has-fullscreen'),
    openWindowsSettings: (): Promise<void> => ipcRenderer.invoke('open-windows-settings'),
    getSplitPath: (mode: number) : Promise<{from: number, to: number}[]> => ipcRenderer.invoke('get-split-path', mode),

    // config window subscribing to backend events
    mapAndModeChanged: (callback: (event: IpcRendererEvent, mapAndMode: {map: number, mode: number}) => void) => ipcRenderer.on('map-and-mode-changed', callback),

});