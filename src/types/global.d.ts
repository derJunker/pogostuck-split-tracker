import {Settings} from "./settings";

declare global { interface Window {
    electronAPI: {
        openSettingsWindow: () => void;
        saveSettings: (settings: Settings) => Promise<void>;
        loadSettings: () => Promise<Settings>;
    };
} }
export {};