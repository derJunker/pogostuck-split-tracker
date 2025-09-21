import {PogoLevel} from "../../types/pogo-index-mapping";
import {Settings} from "../../types/settings";

let settings: Settings;
let mappings: PogoLevel[]
let pbs: {mode: number, time: number}[] = [];
let customModes : {map: number, modeIndex: number, modeTimes: number[]}[] = [];

export async function loadSettingsAndMappingsFromBackend() {
    await Promise.all([loadBackendSettings(), loadBackendMappings()]);
}

export async function loadBackendSettings() {
    settings = await window.electronAPI.loadSettings();
}

export async function loadBackendMappings() {
    mappings = await window.electronAPI.getMappings();
}

export async function loadBackendCustomModes() {
    customModes = await window.electronAPI.getCustomModes();
}

export async function loadBackendPbs() {
    pbs = await window.electronAPI.getPbs();
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

export function getFrontendPbs(): {mode: number, time: number}[] {
    if (!pbs) {
        throw new Error("PBs not loaded yet. Call loadPbs() first.");
    }
    return pbs;
}

export function getFrontendCustomModes(): {map: number, modeIndex: number, modeTimes: number[]}[] {
    if (!customModes) {
        throw new Error("Custom modes not loaded yet. Call loadCustomModes() first.");
    }
    return customModes;
}

export function updateFrontendSettings(newSettings: Settings) {
    return settings = newSettings;
}

export function updateFrontendMappings(newMappings: PogoLevel[]) {
    mappings = newMappings;
}

export function updateFrontendPbs(newPbs: {mode: number, time: number}[]) {
    pbs = newPbs;
}