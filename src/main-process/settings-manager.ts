import {app, BrowserWindow, ipcMain} from "electron";
import {Settings} from "../types/settings";
import fs, {existsSync} from "fs";
import path from "path";
import {FileWatcher} from "./logs-watcher";
import { CurrentStateTracker } from "../data/current-state-tracker";
import { GoldSplitsTracker } from "../data/GoldSplitsTracker";
import { PbSplitTracker } from "../data/pb-split-tracker";
import { PogoNameMappings } from "../data/pogo-name-mappings";
import {writeGoldSplitsIfChanged} from "./read-golden-splits";
import {hasUnusedExtraSplit, isUpsideDownMode} from "../data/valid-modes";
import {onMapOrModeChanged} from "./split-overlay-window";
import {pogoLogName, userDataPathEnd} from "../data/paths";

export class SettingsManager {
    private readonly settingsPath: string;
    private logWatcher: FileWatcher;

    public currentSettings: Settings;


    constructor(logWatcher: FileWatcher) {
        this.settingsPath = path.join(app.getPath("userData"), "settings.json");
        this.currentSettings = this.loadSettings();
        this.logWatcher = logWatcher;
        this.logWatcher.startWatching(this.currentSettings.pogostuckConfigPath, pogoLogName);
    }

    public init(overlayWindow: BrowserWindow, goldenSplitsTracker: GoldSplitsTracker, stateTracker: CurrentStateTracker,
                pbSplitTracker: PbSplitTracker, indexToNamesMappings: PogoNameMappings) {
        overlayWindow.on("ready-to-show", () => {
            this.updateFrontendStatus(overlayWindow)
        })

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
            if (!existsSync(path.join(steamUserDataPath, ...userDataPathEnd))) {
                return this.currentSettings;
            }
            this.currentSettings.pogostuckSteamUserDataPath = steamUserDataPath;
            console.log(`PogoStuck Steam user data path changed to: ${steamUserDataPath}`);
            pbSplitTracker.readPbSplitsFromFile(indexToNamesMappings);
            goldenSplitsTracker.updateGoldSplitsIfInPbSplits(pbSplitTracker, this);
            writeGoldSplitsIfChanged(goldenSplitsTracker)
            const mapNum = stateTracker.getCurrentMap()
            const modeNum = stateTracker.getCurrentMode();
            onMapOrModeChanged(mapNum, modeNum, indexToNamesMappings, pbSplitTracker, goldenSplitsTracker, overlayWindow, this);
            this.saveSettings()
            this.updateFrontendStatus(overlayWindow)
            return this.currentSettings
        });
        ipcMain.handle("pogostuck-config-path-changed", (event, pogostuckConfPath: string) => {
            if (!existsSync(pogostuckConfPath)) {
                console.log(`PogoStuck config path does not exist: ${pogostuckConfPath}`);
                return this.currentSettings;
            }
            console.log(`PogoStuck config path changed to: ${pogostuckConfPath}`);
            this.currentSettings.pogostuckConfigPath = pogostuckConfPath;
            this.logWatcher.startWatching(this.currentSettings.pogostuckConfigPath, pogoLogName);
            this.saveSettings()
            this.updateFrontendStatus(overlayWindow)
            return this.currentSettings
        });
        ipcMain.handle("skip-splits-changed", (event, skippedSplits: {mode:number, skippedSplitIndices: number[]}) => {
            console.log("skippedSplits", skippedSplits);
            const oldSkippedSplits = this.currentSettings.skippedSplits
            const existingIndex = oldSkippedSplits.findIndex(s => s.mode === skippedSplits.mode);
            if (existingIndex !== -1) {
                console.log("updating existing skipped splits", JSON.stringify(skippedSplits));
                oldSkippedSplits[existingIndex].skippedSplitIndices = skippedSplits.skippedSplitIndices;
            } else {
                console.log("putting new skipped splits", JSON.stringify(skippedSplits));
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
        // some of the newer map 1 modes have a unused split for some reason :(
        if (hasUnusedExtraSplit(mode) && splitAmount === 10) {
            splitAmount = 9
            console.log(`Split amount for mode ${mode} is 10, but it should be 9, so adjusting it.`);
        }
        let splitIndexPath: {from: number, to: number}[] = [];
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
        if (isUpsideDownMode(mode)) {
            splitIndexPath = splitIndexPath
                .map(splitStep => {
                    return {from: splitStep.to, to: splitStep.from}
                }).reverse()
        }
        return splitIndexPath;
    }

    private loadSettings(): Settings {
        if (existsSync(this.settingsPath)) {
            // Migration vom alten settings path: Nur entfernen, wenn am Ende, und Trennzeichen-unabhängig
            const settings: Settings = JSON.parse(require("fs").readFileSync(this.settingsPath, "utf-8"));
            if (settings.pogostuckSteamUserDataPath) {
                console.log(`PogoStuck config path loaded: ${settings.pogostuckSteamUserDataPath}`);
                // Regex: entfernt '688130/remote' oder '688130\\remote' am Ende des Strings
                settings.pogostuckSteamUserDataPath = settings.pogostuckSteamUserDataPath.trim().replace(/([\\/])?688130[\\/]+remote([\\/])?$/ , "");
                console.log(`PogoStuck config path after migration: ${settings.pogostuckSteamUserDataPath}`);
            }
            return settings;
        } else {
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

    public getSteamUserDataPath(): string {
        return this.currentSettings.pogostuckSteamUserDataPath;
    }

    public getHideSkippedSplits(): boolean {
        return this.currentSettings.hideSkippedSplits;
    }

    private updateFrontendStatus(overlayWindow: BrowserWindow) {
        const statusMessage = this.createStatusMessage();
        overlayWindow.webContents.send("status-changed", statusMessage);
    }

    private createStatusMessage(): string {
        let msg = "Config Status\n"
        const pogoConfigPathIsValid = existsSync(this.currentSettings.pogostuckConfigPath);
        const steamUserDataPathIsValid = existsSync(path.join(this.currentSettings.pogostuckSteamUserDataPath, ...userDataPathEnd));
        if (pogoConfigPathIsValid && steamUserDataPathIsValid) {
            return "Pogostuck-Splits - Active"
        }
        if (!pogoConfigPathIsValid) {
            msg += `Pogostuck Steam Path: ❌\n`;
        } else {
            msg += `Pogostuck Steam Path: ✅\n`;
        }
        if (!steamUserDataPathIsValid) {
            msg += "Steam user-data path: ❌\n";
        } else {
            msg += "Steam user-data path: ✅\n";
        }
        return msg;
    }

    public getPogostuckPath() {
        return this.currentSettings.pogostuckConfigPath;
    }
}