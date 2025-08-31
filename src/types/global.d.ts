import {Settings} from "./settings";
import {PogoLevel} from "./pogo-index-mapping";
import {ipcRenderer} from "electron";

export interface PbRunInfoAndSoB {
    splits: { name: string; split: number; time: number; hide:boolean; skipped:boolean}[],
    pb: number,
    sumOfBest: number,
    settings: Settings
}

declare global { interface Window {
    electronAPI: {
        // overlay querying to backend
        loadSettings: () => Promise<Settings>;
        getMappings: () => Promise<PogoLevel[]>;
        getPbs: () => Promise<{mode: number, time: number}[]>;

        // overlay subscribing to backend events
        mainMenuOpened: (callback: (event: Electron.IpcRendererEvent) => void) => void;
        resetOverlay: (callback: (event: Electron.IpcRendererEvent,
                                        mapAndMode: PbRunInfoAndSoB) => void) => void;
        redrawOverlay: (callback: (event: Electron.IpcRendererEvent,
                                   pbRunInfoAndSoB: PbRunInfoAndSoB) => void) => void;
        onSplitPassed: (callback: (event: Electron.IpcRendererEvent,
                                   splitInfo: { splitIndex: number, splitTime: number, splitDiff: number, golden: boolean, goldPace: boolean, onlyDiffColored: boolean}) => void) => void;
        onGoldenSplitPassed: (callback: (event: Electron.IpcRendererEvent, sumOfBest: number) => void) => void;
        onStatusChanged: (callback: (event: Electron.IpcRendererEvent, statusMsg: { pogoPathValid: boolean; steamPathValid: boolean; friendCodeValid: boolean; showLogDetectMessage: boolean; logsDetected: boolean }) => void) => void;
        onLastSplitGolden: (callback: (event: Electron.IpcRendererEvent) => void) => void;

        // config window sending events to backend
        onOptionHideSkippedSplitsChanged: (hideSkippedSplits: boolean) => Promise<Settings>;
        onOptionHideWindowWhenPogoNotActive: (hideWindow: boolean) => Promise<Settings>;
        onLaunchPogoOnStartupChanged: (launchPogoOnStartup: boolean) => Promise<Settings>;
        onOptionShowNewSplitNamesChanged: (showNewSplitNames: boolean) => Promise<Settings>;
        onOptionClickThroughOverlayChanged: (clickThroughOverlay: boolean) => Promise<Settings>;
        onSteamUserDataPathChanged: (steamUserDataPath: string) => Promise<Settings>;
        onSteamFriendCodeChanged: (steamFriendCode: string) => Promise<Settings>;
        onPogostuckConfigPathChanged: (pogostuckConfigPath: string) => Promise<Settings>;
        onSkipSplitsChanged: (skippedSplits: {mode:number, skippedSplitIndices: number[]}) => Promise<Settings>;
        onOnlyDiffColoredChanged: (onlyDiffColored: boolean) => Promise<Settings>;
        onRaceGoldsChanged: (raceGolds: boolean) => Promise<Settings>;
        onPbEntered: (modeAndTime: {mode: number, time: number}) => Promise<void>;
        openPogostuck: () => Promise<boolean>;
        onGoldenSplitsEntered: (goldSplitInfo: { map: number, mode: number, from: number, to: number, time: number }) => Promise<boolean>;
        onGoldenPaceEntered: (goldPaceInfo: { map: number, mode: number, splitIndex: number, time: number }) => Promise<boolean>;
        onEnableBackgroundColorChanged: (enable: boolean) => Promise<Settings>;
        onBackgroundColorChanged: (color: string) => Promise<Settings>;
        onLanguageChanged: (language: string) => Promise<Settings>;

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

        // config window subscribing to backend events
        mapAndModeChanged: (callback: (event: Electron.IpcRendererEvent, mapAndMode: {map: number, mode: number}) => void) => void;
        onGoldenSplitsImproved: (callback: (event: Electron.IpcRendererEvent) => void) => void;
        onGoldPaceImproved: (callback: (event: Electron.IpcRendererEvent) => void) => void;
        onPbImproved: (callback: (event: Electron.IpcRendererEvent, data: {mode: number, pbTime: number}) => void) => void;
        onPogoPathFound: (callback: (event: Electron.IpcRendererEvent, path: string) => void) => void;
        onSteamPathFound: (callback: (event: Electron.IpcRendererEvent, path: string) => void) => void;
        onSteamFriendCodeFound: (callback: (event: Electron.IpcRendererEvent, code: string) => void) => void;
        onNewReleaseAvailable: (callback: (event: Electron.IpcRendererEvent, releaseInfo: { tag_name: string, body: string, browser_download_url: string }) => void) => void;


        // Hintergrundfarbe ändern (Overlay)
        changeBackground: (callback: (event: Electron.IpcRendererEvent, enableBackgroundColor: string | null) => void) => void;
    };
} }

export {};