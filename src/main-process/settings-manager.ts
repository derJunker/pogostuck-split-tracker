import {app, ipcMain} from "electron";
import {Settings} from "../types/settings";
import {existsSync} from "fs";
import path from "path";

const settingsPath = path.join(app.getPath("userData"), "settings.json");
export let currentSettings: Settings = {
    pogostuckConfigPath: "",
    pogostuckSteamUserDataPath: "",
    // design
    hideSkippedSplits: false,
    showNewSplitNames: true,

    // split skip
    skippedSplits: []
};


export function initSettings() {
    currentSettings = loadSettings()

    ipcMain.handle("load-settings", () => {
        return currentSettings;
    })
}

function loadSettings(): Settings {
    if (existsSync(settingsPath)) {
        console.log(`Loading settings from ${settingsPath}`);
        return JSON.parse(require("fs").readFileSync(settingsPath, "utf-8"));
    } else {
        console.log(`Settings file not found at ${settingsPath}. Creating default settings.`);
        return {
            pogostuckConfigPath: "",
            pogostuckSteamUserDataPath: "",
            // design
            hideSkippedSplits: false,
            showNewSplitNames: true,

            // split skip
            skippedSplits: []
        };
    }
}