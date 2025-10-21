import {contextBridge, ipcRenderer} from 'electron';
import {Settings} from "../types/settings";
import {PbRunInfoAndSoB} from "../types/global";
import {PogoLevel} from "../types/pogo-index-mapping";
import IpcRendererEvent = Electron.IpcRendererEvent;
import {VERSION} from "../version";
import {CustomModeInfo} from "../types/CustomMode";

contextBridge.exposeInMainWorld('electronAPI', {
    // overlay subscribing to backend events
    mainMenuOpened: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('main-menu-opened', callback),
    resetOverlay: (callback: (event: IpcRendererEvent, mapAndMode: PbRunInfoAndSoB) => void) => ipcRenderer.on('reset-overlay', callback),
    redrawOverlay: (callback: (event: IpcRendererEvent, pbRunInfoAndSoB: PbRunInfoAndSoB) => void) => ipcRenderer.on('redraw-split-display', callback),
    onSplitPassed: (callback: (event: Electron.IpcRendererEvent, splitInfo: { splitIndex: number, splitTime: number, splitDiff: number, golden: boolean, goldPace: boolean, onlyDiffColored: boolean, map3Route?: number}) => void) => ipcRenderer.on('split-passed', callback),
    onGoldenSplitPassed: (callback: (event: Electron.IpcRendererEvent, sumOfBest: number) => void) => ipcRenderer.on('golden-split-passed', callback),
    onStatusChanged: (callback: (event: IpcRendererEvent, statusMsg: { pogoPathValid: boolean; steamPathValid: boolean; friendCodeValid: boolean; showLogDetectMessage: boolean; logsDetected: boolean }) => void) => ipcRenderer.on('status-changed', callback),
    onLastSplitGolden: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('last-split-gold', callback),
    showMessage: (callback: (event: Electron.IpcRendererEvent, message: string) => void) => ipcRenderer.on('show-overlay-message', callback),
    clickThroughChanged: (callback: (event: IpcRendererEvent, clickThrough: boolean) => void) => ipcRenderer.on('click-through-changed', callback),
    lootStarted: (callback: (event: IpcRendererEvent, seed:string, isSpeedrunning: boolean) => void) => ipcRenderer.on('loot-started', callback),

    // config window sending events to backend
    onOptionHideSkippedSplitsChanged: (hideSkippedSplits: boolean) => ipcRenderer.invoke('option-hide-skipped-splits-changed', hideSkippedSplits),
    onOptionHideWindowWhenPogoNotActive: (hideWindow: boolean) => ipcRenderer.invoke('option-hide-overlay-when-not-active-changed', hideWindow),
    onLaunchPogoOnStartupChanged: (launchPogoOnStartup: boolean) => ipcRenderer.invoke('option-launch-pogo-on-startup', launchPogoOnStartup),
    onOptionShowNewSplitNamesChanged: (showNewSplitNames: boolean) => ipcRenderer.invoke('option-show-new-split-names-changed', showNewSplitNames),
    onOptionClickThroughOverlayChanged: (clickThroughOverlay: boolean) => ipcRenderer.invoke('option-click-through-overlay-changed', clickThroughOverlay),
    onSteamUserDataPathChanged: (steamUserDataPath: string, steamFriendCode: string) => ipcRenderer.invoke('steam-path-changed', steamUserDataPath, steamFriendCode),
    onSteamFriendCodeChanged: (steamFriendCode: string) => ipcRenderer.invoke('steam-friend-code-changed', steamFriendCode),
    onPogostuckConfigPathChanged: (pogostuckConfigPath: string) => ipcRenderer.invoke('pogostuck-config-path-changed', pogostuckConfigPath),
    onSkipSplitsChanged: (skippedSplits: {mode:number, skippedSplitIndices: number[]}) => ipcRenderer.invoke('skip-splits-changed', skippedSplits),
    onOnlyDiffColoredChanged: (onlyDiffColored: boolean) => ipcRenderer.invoke('only-diff-colored-changed', onlyDiffColored),
    onShowResetCountersChanged: (showResetCounters: boolean): Promise<Settings> => ipcRenderer.invoke('show-reset-counters-changed', showResetCounters),
    onReverseUDSplits: (reverseUDSPlits: boolean): Promise<Settings> => ipcRenderer.invoke('reverse-ud-splits', reverseUDSPlits),
    onRaceGoldsChanged: (raceGolds: boolean) => ipcRenderer.invoke('race-golds-changed', raceGolds),
    onPbEntered: (modeAndTime: {mode: number, time: number}) => ipcRenderer.invoke('pb-entered', modeAndTime),
    openPogostuck: (): Promise<boolean> => ipcRenderer.invoke('open-pogostuck'),
    onGoldenSplitsEntered: (goldSplitInfo: { map: number, mode: number, from: number, to: number, time: number }): Promise<boolean> => ipcRenderer.invoke('gold-split-entered', goldSplitInfo),
    onGoldenPaceEntered: (goldPaceInfo: { map: number, mode: number, splitIndex: number, time: number }): Promise<boolean> => ipcRenderer.invoke('gold-pace-entered', goldPaceInfo),
    onEnableBackgroundColorChanged: (enable: boolean) => ipcRenderer.invoke('enable-background-color-changed', enable),
    onShowSoBChanged: (showSoB: boolean): Promise<Settings> => ipcRenderer.invoke('show-sob-changed', showSoB),
    onShowPaceChanged: (showPace: boolean): Promise<Settings> => ipcRenderer.invoke('show-pace-changed', showPace),
    onBackgroundColorChanged: (color: string) => ipcRenderer.invoke('background-color-changed', color),
    onGoldSplitColorColorChanged: (color: string) => ipcRenderer.invoke('gold-split-color-changed', color),
    onGoldPaceColorColorChanged: (color: string) => ipcRenderer.invoke('gold-pace-color-changed', color),
    onFastSplitColorColorChanged: (color: string) => ipcRenderer.invoke('fast-split-color-changed', color),
    onSlowSplitColorColorChanged: (color: string) => ipcRenderer.invoke('slow-split-color-changed', color),
    onLanguageChanged: (language: string): Promise<Settings> => ipcRenderer.invoke('language-changed', language),
    tabChanged: (tabId: string): Promise<void> =>  ipcRenderer.invoke('tab-changed', tabId),
    onCreateCustomMode: (map: number): Promise<{ index: number, name: string }> => ipcRenderer.invoke('create-custom-mode', map),
    onCustomModeSave: (modeIndex: number, newName: string): Promise<PogoLevel[]> => ipcRenderer.invoke('save-custom-mode-name', modeIndex, newName),
    onPlayCustomMode: (modeIndex: number): Promise<boolean> => ipcRenderer.invoke('play-custom-mode', modeIndex),
    onDeleteCustomMode: (modeIndex: number): Promise<void> => ipcRenderer.invoke('delete-custom-mode', modeIndex),
    onUpdateBtnClicked: (downloadLink: string): Promise<void> => ipcRenderer.invoke('update-btn-clicked', downloadLink),
    onRevertGoldSplit: (from: number, to: number, mode: number): Promise<number> => ipcRenderer.invoke('revert-gold-split', from, to, mode),
    onCustomModeIsUDModeChanged: (isUDMode: boolean, modeIndex: number): Promise<void> => ipcRenderer.invoke('custom-mode-is-ud-mode-changed', isUDMode, modeIndex),
    onCustomModeIsRBModeChanged: (isRBMode: boolean, modeIndex: number): Promise<void> => ipcRenderer.invoke('custom-mode-is-rb-mode-changed', isRBMode, modeIndex),
    openLinkInBrowser: (link: string): Promise<void> => ipcRenderer.invoke('open-link-in-browser', link),


    // config querying backend
    isWindows11: (): Promise<boolean> => ipcRenderer.invoke('is-windows-11'),
    hasPogostuckFullscreen: (): Promise<boolean> => ipcRenderer.invoke('has-fullscreen'),
    openWindowsSettings: (): Promise<void> => ipcRenderer.invoke('open-windows-settings'),
    getSplitPath: (mode: number) : Promise<{from: number, to: number}[]> => ipcRenderer.invoke('get-split-path', mode),
    getGoldSplits: (mode: number) : Promise<{from: number, to: number, time: number}[]> => ipcRenderer.invoke('get-gold-splits', mode),
    getGoldPaces: (mode: number) : Promise<{ splitIndex: number, time: number}[]> => ipcRenderer.invoke('get-gold-paces', mode),
    openAppdataExplorer: (): Promise<void> => ipcRenderer.invoke('open-appdata-explorer'),
    getRecentLogs: (): Promise<string> => ipcRenderer.invoke('recent-logs'),
    getVersion: (): Promise<string> => ipcRenderer.invoke('get-version'),
    loadSettings: (): Promise<Settings> => ipcRenderer.invoke('load-settings'),
    getMappings: (): Promise<PogoLevel[]> => ipcRenderer.invoke('get-mappings'),
    getSelectedTab: (): Promise<string> => ipcRenderer.invoke('get-selected-tab'),
    getPbs: (): Promise<{mode: number, time: number}[]> => ipcRenderer.invoke('get-pbs'),
    getCustomModes: (): Promise<CustomModeInfo[]> => ipcRenderer.invoke('get-custom-modes'),
    getValidRollbacks: (mode: number): Promise<{from: number, to: number, valid: boolean, oldTime?: number}[]> => ipcRenderer.invoke('get-valid-rollbacks', mode),

    // config window subscribing to backend events
    mapAndModeChanged: (callback: (event: IpcRendererEvent, mapAndMode: {map: number, mode: number}) => void) => ipcRenderer.on('map-and-mode-changed', callback),
    onGoldenSplitsImproved: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('golden-splits-changed', callback),
    onGoldPaceImproved: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('golden-paces-changed', callback),
    changeBackground: (callback: (event: Electron.IpcRendererEvent, enableBackgroundColor: string | null) => void) => ipcRenderer.on('change-background', callback),
    changeGoldSplitColor: (callback: (event: Electron.IpcRendererEvent, goldSplitColor: string) => void) => ipcRenderer.on('change-gold-split-color', callback),
    changeGoldPaceColor: (callback: (event: Electron.IpcRendererEvent, goldPaceColor: string) => void) => ipcRenderer.on('change-gold-pace-color', callback),
    changeFastSplitColor: (callback: (event: Electron.IpcRendererEvent, fastSplitColor: string) => void) => ipcRenderer.on('change-fast-split-color', callback),
    changeSlowSplitColor: (callback: (event: Electron.IpcRendererEvent, slowSplitColor: string) => void) => ipcRenderer.on('change-slow-split-color', callback),
    onPbImproved: (callback: (event: IpcRendererEvent, data: {mode: number, pbTime: number}) => void) => ipcRenderer.on('pb-improved', callback),
    onPogoPathFound: (callback: (event: IpcRendererEvent, path: string) => void) => ipcRenderer.on('pogostuck-config-path-found', callback),
    onSteamPathFound: (callback: (event: IpcRendererEvent, path: string) => void) => ipcRenderer.on('steam-user-data-path-found', callback),
    onSteamFriendCodeFound: (callback: (event: IpcRendererEvent, code: string) => void) => ipcRenderer.on('steam-friend-code-found', callback),
    onNewReleaseAvailable: (callback: (event: Electron.IpcRendererEvent, releaseInfo: { tag_name: string, body: string, browser_download_url: string }) => void) => ipcRenderer.on('new-release-available', callback),
    onCustomModeStopped: (callback: (event: Electron.IpcRendererEvent) => void) => ipcRenderer.on('custom-mode-stopped', callback),
});