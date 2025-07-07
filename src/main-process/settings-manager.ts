import {app, BrowserWindow, ipcMain} from "electron";
import {Settings} from "../types/settings";
import fs, {existsSync} from "fs";
import path from "path";
import {FileWatcher} from "./logs-watcher";
import {onMapOrModeChanged} from "./log-event-handler";
import { CurrentStateTracker } from "../data/current-state-tracker";
import { GoldSplitsTracker } from "../data/GoldSplitsTracker";
import { PbSplitTracker } from "../data/pb-split-tracker";
import { PogoNameMappings } from "../data/pogo-name-mappings";

export class SettingsManager {
    private readonly settingsPath: string;
    private logWatcher: FileWatcher;

    public currentSettings: Settings;


    constructor(logWatcher: FileWatcher) {
        this.settingsPath = path.join(app.getPath("userData"), "settings.json");
        this.currentSettings = this.loadSettings();
        this.logWatcher = logWatcher;
        this.logWatcher.startWatching(this.currentSettings.pogostuckConfigPath, "acklog.txt");
    }

    public init(overlayWindow: BrowserWindow, goldenSplitsTracker: GoldSplitsTracker, stateTracker: CurrentStateTracker, pbSplitTracker: PbSplitTracker, indexToNamesMappings: PogoNameMappings) {
        indexToNamesMappings.switchMap1SplitNames(this.currentSettings.showNewSplitNames)
        ipcMain.handle("load-settings", () => {
            return this.currentSettings;
        });

        ipcMain.handle("option-hide-skipped-splits-changed", (event, hideSplits: boolean) => {
            this.currentSettings.hideSkippedSplits = hideSplits;
            const mapNum = stateTracker.getCurrentMap()
            const modeNum = stateTracker.getCurrentMode();
            onMapOrModeChanged(mapNum, modeNum, indexToNamesMappings, pbSplitTracker, goldenSplitsTracker, overlayWindow, this);
            this.saveSettings()
            return this.currentSettings
        });
        ipcMain.handle("option-show-new-split-names-changed", (event, showNewSplits: boolean) => {
            this.currentSettings.showNewSplitNames = showNewSplits;
            const mapNum = stateTracker.getCurrentMap()
            const modeNum = stateTracker.getCurrentMode();
            indexToNamesMappings.switchMap1SplitNames(showNewSplits)
            onMapOrModeChanged(mapNum, modeNum, indexToNamesMappings, pbSplitTracker, goldenSplitsTracker, overlayWindow, this);
            this.saveSettings()
            return this.currentSettings
        });
        ipcMain.handle("steam-user-data-path-changed", (event, steamUserDataPath: string) => {
            if (!existsSync(steamUserDataPath)) {
                return this.currentSettings;
            }
            this.currentSettings.pogostuckSteamUserDataPath = steamUserDataPath;
            pbSplitTracker.readPbSplitsFromFile(path.join(steamUserDataPath, "settings.txt"), indexToNamesMappings);
            goldenSplitsTracker.updateGoldSplitsIfInPbSplits(pbSplitTracker, this);
            this.saveSettings()
            return this.currentSettings
        });
        ipcMain.handle("pogostuck-config-path-changed", (event, pogostuckConfPath: string) => {
            if (!existsSync(pogostuckConfPath)) {
                return this.currentSettings;
            }
            this.currentSettings.pogostuckConfigPath = pogostuckConfPath;
            this.logWatcher.startWatching(this.currentSettings.pogostuckConfigPath, "acklog.txt");
            this.saveSettings()
            return this.currentSettings
        });
        ipcMain.handle("skip-splits-changed", (event, skippedSplits: {mode:number, skippedSplitIndices: number[]}) => {
            const oldSkippedSplits = this.currentSettings.skippedSplits
            const existingIndex = oldSkippedSplits.findIndex(s => s.mode === skippedSplits.mode);
            if (existingIndex !== -1) {
                oldSkippedSplits[existingIndex].skippedSplitIndices = skippedSplits.skippedSplitIndices;
            } else {
                oldSkippedSplits.push(skippedSplits);
            }
            const mapNum = stateTracker.getCurrentMap()
            const modeNum = stateTracker.getCurrentMode();
            goldenSplitsTracker.updateGoldSplitsIfInPbSplits(pbSplitTracker, this)
            onMapOrModeChanged(mapNum, modeNum, indexToNamesMappings, pbSplitTracker, goldenSplitsTracker, overlayWindow, this);
            this.saveSettings()
            return this.currentSettings;
        });
    }

    public getSplitIndexPath( mode: number, splitAmount: number ): {from: number, to: number}[] {
        if (mode === 4 && splitAmount === 10) splitAmount = 9 //idk why but NAS has 10 splits with 1 unused :)
        const splitIndexPath: {from: number, to: number}[] = [];
        let lastTo = -1;
        let index = -1
        while (index < splitAmount) {
            const from = lastTo;
            index++;
            if (this.splitShouldBeSkipped(mode, index))
                continue;
            const to = index;
            splitIndexPath.push({from, to});
            lastTo = to;
        }
        return splitIndexPath;
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

    public splitShouldBeSkipped(mode: number, splitIndex: number): boolean {
        const skippedSplits = this.currentSettings.skippedSplits.find(s => s.mode === mode);
        if (skippedSplits) {
            return skippedSplits.skippedSplitIndices.includes(splitIndex);
        }
        return false;
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