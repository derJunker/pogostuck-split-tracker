import {Settings} from "./settings";
import {PogoLevel} from "./pogo-index-mapping";
import {CustomModeInfo} from "./CustomMode";

export interface SplitInfo {
    name: string; split: string; time: number; hide:boolean; skipped:boolean, resets: number
}

export interface PbRunInfoAndSoB {
    splits: SplitInfo[],
    sumOfBest: number,
    pace: number
    settings: Settings,
    isUDMode: boolean,
    map: number,
    customModeName?: string
    playAnimation: boolean,
}

export interface SplitPassedInfo {
    splitId: string,
    splitTime: number,
    splitDiff: number,
    golden: boolean,
    goldPace: boolean,
    onlyDiffColored: boolean,
    map3Route?: number
}

export interface OverlayStatus {
    pogoPathValid: boolean;
    steamPathValid: boolean;
    friendCodeValid: boolean;
    showLogDetectMessage: boolean;
    logsDetected: boolean
}

declare global { interface Window {
    electronAPI: {
        // overlay subscribing to backend events
        mainMenuOpened: (callback: (event: Electron.IpcRendererEvent) => void) => void;
        resetOverlay: (callback: (event: Electron.IpcRendererEvent,
                                        mapAndMode: PbRunInfoAndSoB) => void) => void;
        redrawOverlay: (callback: (event: Electron.IpcRendererEvent,
                                   pbRunInfoAndSoB: PbRunInfoAndSoB, reverseSplits: boolean) => void) => void;
        onSplitPassed: (callback: (event: Electron.IpcRendererEvent,
                                   splitInfo: SplitPassedInfo) => void) => void;
        onGoldenSplitPassed: (callback: (event: Electron.IpcRendererEvent, sumOfBest: number) => void) => void;
        onStatusChanged: (callback: (event: Electron.IpcRendererEvent, statusMsg: OverlayStatus) => void) => void;
        showMessage: (callback: (event: Electron.IpcRendererEvent, message: string) => void) => void;
        clickThroughChanged: (callback: (event: Electron.IpcRendererEvent, notClickThrough: boolean) => void) => void;
        lootStarted: (callback: (event: Electron.IpcRendererEvent, seed:string, isSpeedrunning: boolean) => void) => void;

        // config window sending events to backend
        onOptionHideSkippedSplitsChanged: (hideSkippedSplits: boolean) => Promise<Settings>;
        onOptionHideWindowWhenPogoNotActive: (hideWindow: boolean) => Promise<Settings>;
        onLaunchPogoOnStartupChanged: (launchPogoOnStartup: boolean) => Promise<Settings>;
        onOptionShowNewSplitNamesChanged: (showNewSplitNames: boolean) => Promise<Settings>;
        onOptionClickThroughOverlayChanged: (clickThroughOverlay: boolean) => Promise<Settings>;
        onSteamUserDataPathChanged: (steamUserDataPath: string, steamFriendCode: string) => Promise<Settings>;
        onSteamFriendCodeChanged: (steamFriendCode: string) => Promise<Settings>;
        onPogostuckConfigPathChanged: (pogostuckConfigPath: string) => Promise<Settings>;
        onSkipSplitsChanged: (skippedSplits: {mode:number, skippedSplitIndices: number[]}) => Promise<Settings>;
        onOnlyDiffColoredChanged: (onlyDiffColored: boolean) => Promise<Settings>;
        onShowResetCountersChanged: (showResetCounters: boolean) => Promise<Settings>;
        onReverseUDSplits: (reverseUDSplits: boolean) => Promise<Settings>;
        onRaceGoldsChanged: (raceGolds: boolean) => Promise<Settings>;
        onPbEntered: (modeAndTime: {mode: number, time: number}) => Promise<void>;
        openPogostuck: () => Promise<boolean>;
        onGoldenSplitsEntered: (goldSplitInfo: { map: number, mode: number, from: number, to: number, time: number }) => Promise<boolean>;
        onGoldenPaceEntered: (goldPaceInfo: { map: number, mode: number, splitIndex: number, time: number }) => Promise<boolean>;
        onEnableBackgroundColorChanged: (enable: boolean) => Promise<Settings>;
        onShowSoBChanged: (showSoB: boolean) => Promise<Settings>;
        onShowPaceChanged: (showPace: boolean) => Promise<Settings>;
        onBackgroundColorChanged: (color: string) => Promise<void>;
        onGoldSplitColorColorChanged: (color: string) => Promise<void>;
        onGoldPaceColorColorChanged: (color: string) => Promise<void>;
        onFastSplitColorColorChanged: (color: string) => Promise<void>;
        onSlowSplitColorColorChanged: (color: string) => Promise<void>;
        onLanguageChanged: (language: string) => Promise<Settings>;
        tabChanged: (tabId: string) => Promise<void>; // Dont have to return settings, because the frontend doesnt
        // need to save this, its only needed for the startup
        onCreateCustomMode: (map: number) => Promise<{ index: number, name: string }>;
        onCustomModeSave: (modeIndex: number, newName: string) => Promise<PogoLevel[]>;
        onPlayCustomMode: (modeIndex: number) => Promise<boolean>;
        onDeleteCustomMode: (modeIndex: number) => Promise<void>;
        onUpdateBtnClicked: (downloadLink: string) => Promise<void>;
        onRevertGoldSplit: (from: number, to: number, mode: number) => Promise<number>,
        onCustomModeIsUDModeChanged: (isUDMode: boolean, modeIndex: number) => Promise<void>
        onCustomModeIsRBModeChanged: (isRBMode: boolean, modeIndex: number) => Promise<void>
        openLinkInBrowser: (link: string) => Promise<void>;


        // config querying backend
        isWindows11: () => Promise<boolean>;
        hasPogostuckFullscreen: () => Promise<boolean>;
        openWindowsSettings: () => Promise<void>;
        getSplitPath: (mode: number) => Promise<{from: number, to: number}[]>;
        getGoldSplits: (mode: number) => Promise<{from: number, to: number, time: number}[]>;
        getGoldPaces: (mode: number) => Promise<{splitIndex: number, time: number}[]>;
        openAppdataExplorer: () => Promise<void>;
        getRecentLogs: () => Promise<string>;
        getVersion: () => Promise<string>;
        loadSettings: () => Promise<Settings>;
        getMappings: () => Promise<PogoLevel[]>;
        getSelectedTab: () => Promise<string>;
        getPbs: () => Promise<{mode: number, time: number}[]>;
        getCustomModes: () => Promise<CustomModeInfo[]>;
        getValidRollbacks: (mode: number) => Promise<{from: number, to: number, valid: boolean, oldTime?: number}[]>

        // config window subscribing to backend events
        mapAndModeChanged: (callback: (event: Electron.IpcRendererEvent, mapAndMode: {map: number, mode: number}) => void) => void;
        onGoldenSplitsImproved: (callback: (event: Electron.IpcRendererEvent) => void) => void;
        onGoldPaceImproved: (callback: (event: Electron.IpcRendererEvent) => void) => void;
        onPbImproved: (callback: (event: Electron.IpcRendererEvent, data: {mode: number, pbTime: number}) => void) => void;
        onPogoPathFound: (callback: (event: Electron.IpcRendererEvent, path: string) => void) => void;
        onSteamPathFound: (callback: (event: Electron.IpcRendererEvent, path: string) => void) => void;
        onSteamFriendCodeFound: (callback: (event: Electron.IpcRendererEvent, code: string) => void) => void;
        onNewReleaseAvailable: (callback: (event: Electron.IpcRendererEvent, releaseInfo: { tag_name: string, body: string, browser_download_url: string }) => void) => void;
        selectTab: (callback: (event: Electron.IpcRendererEvent, tab: string) => void) => void;
        onCustomModeStopped: (callback: (event: Electron.IpcRendererEvent) => void) => void;

        // Hintergrundfarbe ändern (Overlay)
        changeBackground: (callback: (event: Electron.IpcRendererEvent, enableBackgroundColor: string | null) => void) => void;
        changeGoldSplitColor: (callback: (event: Electron.IpcRendererEvent, goldSplitColor: string) => void) => void;
        changeGoldPaceColor: (callback: (event: Electron.IpcRendererEvent, goldPaceColor: string) => void) => void;
        changeFastSplitColor: (callback: (event: Electron.IpcRendererEvent, fastSplitColor: string) => void) => void;
        changeSlowSplitColor: (callback: (event: Electron.IpcRendererEvent, slowSplitColor: string) => void) => void;
    };
} }

export {};