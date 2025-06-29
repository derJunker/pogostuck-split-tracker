import {Settings} from "./settings";

declare global { interface Window {
    electronAPI: {
        openSettingsWindow: () => void;
        saveSettings: (settings: Settings) => Promise<void>;
        loadSettings: () => Promise<Settings>;
        onMapOrModeChanged: (callback: (event: Electron.IpcRendererEvent,
                                        mapAndMode: { map: string, mode: string }) => void) => void;
        onSplitPassed: (callback: (event: Electron.IpcRendererEvent,
                                   splitInfo: { splitIndex: number, splitTime: number, splitDiff: number }) => void) => void;
    };
} }
export {};