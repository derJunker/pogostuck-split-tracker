import {PogoLevel} from "../../types/pogo-index-mapping";
import {Settings} from "../../types/settings";

let settings: Settings;
let mappings: PogoLevel[]

export async function loadSettingsAndMappingsFromBackend() {
    await Promise.all([loadBackendSettings(), loadBackendMappings()]);
}

export async function loadBackendSettings() {
    settings = await window.electronAPI.loadSettings();
}

export async function loadBackendMappings() {
    mappings = await window.electronAPI.getMappings();
}

export function getFrontendSettings(): Settings {
    if (!settings) {
        throw new Error("Settings not loaded yet. Call loadSettings() first.");
    }
    return settings;
}

export function getFrontendMappings(): PogoLevel[] {
    if (!mappings) {
        throw new Error("Mappings not loaded yet. Call loadMappings() first.");
    }
    return mappings;
}

export function updateFrontendSettings(newSettings: Settings) {
    return settings = newSettings;
}

export function updateFrontendMappings(newMappings: PogoLevel[]) {
    mappings = newMappings;
}