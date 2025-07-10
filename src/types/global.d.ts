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
                                   splitInfo: { splitIndex: number, splitTime: number, splitDiff: number, golden: boolean, onlyDiffColored: boolean}) => void) => void;
        onGoldenSplitPassed: (callback: (event: Electron.IpcRendererEvent, sumOfBest: number) => void) => void;
        onStatusChanged: (callback: (event: Electron.IpcRendererEvent, statusMsg: string) => void) => void;

        // config window sending events to backend
        onOptionHideSkippedSplitsChanged: (hideSkippedSplits: boolean) => Promise<Settings>;
        onLaunchPogoOnStartupChanged: (launchPogoOnStartup: boolean) => Promise<Settings>;
        onOptionShowNewSplitNamesChanged: (showNewSplitNames: boolean) => Promise<Settings>;
        onSteamUserDataPathChanged: (steamUserDataPath: string) => Promise<Settings>;
        onPogostuckConfigPathChanged: (pogostuckConfigPath: string) => Promise<Settings>;
        onSkipSplitsChanged: (skippedSplits: {mode:number, skippedSplitIndices: number[]}) => Promise<Settings>;
        onOnlyDiffColoredChanged: (onlyDiffColored: boolean) => Promise<Settings>;
        onPbEntered: (modeAndTime: {mode: number, time: number}) => Promise<void>;
        openPogostuck: () => Promise<boolean>;

        // config querying backend
        isWindows11: () => Promise<boolean>;
        hasPogostuckFullscreen: () => Promise<boolean>;
        openWindowsSettings: () => Promise<void>;
        getSplitPath: (mode: number) => Promise<{from: number, to: number}[]>;

        // config window subscribing to backend events
        mapAndModeChanged: (callback: (event: Electron.IpcRendererEvent, mapAndMode: {map: number, mode: number}) => void) => void;
    };
} }

export {};