import {app, ipcMain} from "electron";
import {Settings} from "../types/settings";
import fs, {existsSync} from "fs";
import path from "path";

export class SettingsManager {
    private settingsPath: string;
    public currentSettings: Settings;

    constructor() {
        this.settingsPath = path.join(app.getPath("userData"), "settings.json");
        this.currentSettings = this.loadSettings();
    }

    public init() {
        ipcMain.handle("load-settings", () => {
            return this.currentSettings;
        });

        ipcMain.handle("option-hide-skipped-splits-changed", (event, hideSplits: boolean) => {
            this.currentSettings.hideSkippedSplits = hideSplits;
            this.saveSettings()
        });
        ipcMain.handle("option-show-new-split-names-changed", (event, showNewSplits: boolean) => {
            this.currentSettings.showNewSplitNames = showNewSplits;
            this.saveSettings()
        });
        ipcMain.handle("steam-user-data-path-changed", (event, steamUserDataPath: string) => {
            this.currentSettings.pogostuckSteamUserDataPath = steamUserDataPath;
            this.saveSettings()
        });
        ipcMain.handle("pogostuck-config-path-changed", (event, pogostuckConfPath: string) => {
            this.currentSettings.pogostuckConfigPath = pogostuckConfPath;
            this.saveSettings()
        });
        ipcMain.handle("skip-splits-changed", (event, skippedSplits: {mode:number, skippedSplitIndices: number[]}[]) => {
            this.currentSettings.skippedSplits = skippedSplits;
            this.saveSettings()
        });
    }

    private loadSettings(): Settings {
        if (existsSync(this.settingsPath)) {
            console.log(`Loading settings from ${this.settingsPath}`);
            return JSON.parse(require("fs").readFileSync(this.settingsPath, "utf-8"));
        } else {
            console.log(`Settings file not found at ${this.settingsPath}. Creating default settings.`);
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

    private saveSettings() {
        fs.writeFileSync(this.settingsPath, JSON.stringify(this.currentSettings, null, 2), "utf-8");
    }

    public getPogoStuckConfigPath(): string {
        return this.currentSettings.pogostuckConfigPath;
    }

    public getPogoStuckSteamUserDataPath(): string {
        return this.currentSettings.pogostuckSteamUserDataPath;
    }

    public getHideSkippedSplits(): boolean {
        return this.currentSettings.hideSkippedSplits;
    }

    public getShowNewSplitNames(): boolean {
        return this.currentSettings.showNewSplitNames;
    }

    public getSkippedSplits(): {mode: number, skippedSplitIndices: number[]}[] {
        return this.currentSettings.skippedSplits;
    }

}