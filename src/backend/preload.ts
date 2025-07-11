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
    onNewReleaseAvailable: (callback: (event: Electron.IpcRendererEvent, releaseInfo: { tag_name: string, body: string, browser_download_url: string }) => void) => ipcRenderer.on('new-release-available', callback),

    // config window sending events to backend
    onOptionHideSkippedSplitsChanged: (hideSkippedSplits: boolean) => ipcRenderer.invoke('option-hide-skipped-splits-changed', hideSkippedSplits),
    onLaunchPogoOnStartupChanged: (launchPogoOnStartup: boolean) => ipcRenderer.invoke('option-launch-pogo-on-startup', launchPogoOnStartup),
    onOptionShowNewSplitNamesChanged: (showNewSplitNames: boolean) => ipcRenderer.invoke('option-show-new-split-names-changed', showNewSplitNames),
    onOptionClickThroughOverlayChanged: (clickThroughOverlay: boolean) => ipcRenderer.invoke('option-click-through-overlay-changed', clickThroughOverlay),
    onSteamUserDataPathChanged: (steamUserDataPath: string) => ipcRenderer.invoke('steam-user-data-path-changed', steamUserDataPath),
    onPogostuckConfigPathChanged: (pogostuckConfigPath: string) => ipcRenderer.invoke('pogostuck-config-path-changed', pogostuckConfigPath),
    onSkipSplitsChanged: (skippedSplits: {mode:number, skippedSplitIndices: number[]}) => ipcRenderer.invoke('skip-splits-changed', skippedSplits),
    onOnlyDiffColoredChanged: (onlyDiffColored: boolean) => ipcRenderer.invoke('only-diff-colored-changed', onlyDiffColored),
    onPbEntered: (modeAndTime: {mode: number, time: number}) => ipcRenderer.invoke('pb-entered', modeAndTime),
    openPogostuck: (): Promise<boolean> => ipcRenderer.invoke('open-pogostuck'),
    onGoldenSplitsEntered: (goldSplitInfo: { map: number, mode: number, from: number, to: number, time: number }): Promise<boolean> => ipcRenderer.invoke('gold-split-entered', goldSplitInfo),
    onEnableBackgroundColorChanged: (enable: boolean) => ipcRenderer.invoke('enable-background-color-changed', enable),
    onBackgroundColorChanged: (color: string) => ipcRenderer.invoke('background-color-changed', color),

    // config querying backend
    isWindows11: (): Promise<boolean> => ipcRenderer.invoke('is-windows-11'),
    hasPogostuckFullscreen: (): Promise<boolean> => ipcRenderer.invoke('has-fullscreen'),
    openWindowsSettings: (): Promise<void> => ipcRenderer.invoke('open-windows-settings'),
    getSplitPath: (mode: number) : Promise<{from: number, to: number}[]> => ipcRenderer.invoke('get-split-path', mode),
    getGoldSplits: (mode: number) : Promise<{from: number, to: number, time: number}[]> => ipcRenderer.invoke('get-gold-splits', mode),

    // config window subscribing to backend events
    mapAndModeChanged: (callback: (event: IpcRendererEvent, mapAndMode: {map: number, mode: number}) => void) => ipcRenderer.on('map-and-mode-changed', callback),
    onGoldenSplitsImproved: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('golden-splits-changed', callback),
    changeBackground: (callback: (event: Electron.IpcRendererEvent, enableBackgroundColor: string | null) => void) => ipcRenderer.on('change-background', callback)

});