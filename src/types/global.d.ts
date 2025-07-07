import {Settings} from "./settings";
import {PogoLevel} from "./pogo-index-mapping";

export interface mapAndModeChanged {
    map: string;
    mode: string;
    splits: { name: string; split: number; time: number; hide:boolean; skipped:boolean}[],
    pb: number,
    sumOfBest: number
}

declare global { interface Window {
    electronAPI: {
        loadSettings: () => Promise<Settings>;
        getMappings: () => Promise<PogoLevel[]>;
        getPbs: () => Promise<{mode: number, time: number}[]>;
        onMapOrModeChanged: (callback: (event: Electron.IpcRendererEvent,
                                        mapAndMode: mapAndModeChanged) => void) => void;
        mainMenuOpened: (callback: (event: Electron.IpcRendererEvent) => void) => void;
        onSplitPassed: (callback: (event: Electron.IpcRendererEvent,
                                   splitInfo: { splitIndex: number, splitTime: number, splitDiff: number, golden: boolean}) => void) => void;
        onGoldenSplitPassed: (callback: (event: Electron.IpcRendererEvent, sumOfBest: number) => void) => void;

        onOptionHideSkippedSplitsChanged: (hideSkippedSplits: boolean) => Promise<Settings>;
        onOptionShowNewSplitNamesChanged: (showNewSplitNames: boolean) => Promise<Settings>;

        onSteamUserDataPathChanged: (steamUserDataPath: string) => Promise<Settings>;
        onPogostuckConfigPathChanged: (pogostuckConfigPath: string) => Promise<Settings>;

        onSkipSplitsChanged: (skippedSplits: {mode:number, skippedSplitIndices: number[]}) => Promise<Settings>;
        onPbEntered: (modeAndTime: {mode: number, time: number}) => Promise<void>;
    };
} }

export {};