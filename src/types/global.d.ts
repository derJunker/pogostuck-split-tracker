import {Settings} from "./settings";
import {ipcRenderer} from "electron";
import {PogoLevel} from "./pogo-index-mapping";

export interface mapAndModeChanged {
    map: string;
    mode: string;
    splits: { name: string; split: number; time: number }[],
    pb: number,
    sumOfBest: number
}

declare global { interface Window {
    electronAPI: {
        loadSettings: () => Promise<Settings>;
        getMappings: () => Promise<PogoLevel[]>;
        onMapOrModeChanged: (callback: (event: Electron.IpcRendererEvent,
                                        mapAndMode: mapAndModeChanged) => void) => void;
        onSplitPassed: (callback: (event: Electron.IpcRendererEvent,
                                   splitInfo: { splitIndex: number, splitTime: number, splitDiff: number, golden: boolean}) => void) => void;
        onGoldenSplitPassed: (callback: (event: Electron.IpcRendererEvent, sumOfBest: number) => void) => void;

        onOptionHideSkippedSplitsChanged: (hideSkippedSplits: boolean) => Promise<void>;
        onOptionShowNewSplitNamesChanged: (showNewSplitNames: boolean) => Promise<void>;

        onSteamUserDataPathChanged: (steamUserDataPath: string) => Promise<void>;
        onPogostuckConfigPathChanged: (pogostuckConfigPath: string) => Promise<void>;

        onSkipSplitsChanged: (skippedSplits: {mode:number, skippedSplitIndices: number[]}[]) => Promise<void>;
    };
} }

export {};