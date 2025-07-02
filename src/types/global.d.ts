import {Settings} from "./settings";

export interface mapAndModeChanged {
    map: string;
    mode: string;
    splits: { name: string; split: number; time: number }[],
    pb: number,
    sumOfBest: number
}

declare global { interface Window {
    electronAPI: {
        openSettingsWindow: () => void;
        saveSettings: (settings: Settings) => Promise<void>;
        loadSettings: () => Promise<Settings>;
        onMapOrModeChanged: (callback: (event: Electron.IpcRendererEvent,
                                        mapAndMode: mapAndModeChanged) => void) => void;
        onSplitPassed: (callback: (event: Electron.IpcRendererEvent,
                                   splitInfo: { splitIndex: number, splitTime: number, splitDiff: number, golden: boolean}) => void) => void;
    };
} }
export {};