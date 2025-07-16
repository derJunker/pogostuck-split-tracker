import {app, BrowserWindow, ipcMain} from "electron";
import {Settings} from "../types/settings";
import fs, {existsSync} from "fs";
import path from "path";
import {FileWatcher} from "./logging/logs-watcher";
import { CurrentStateTracker } from "./data/current-state-tracker";
import { GoldSplitsTracker } from "./data/gold-splits-tracker";
import { PbSplitTracker } from "./data/pb-split-tracker";
import { PogoNameMappings } from "./data/pogo-name-mappings";
import {writeGoldSplitsIfChanged} from "./file-reading/read-golden-splits";
import {hasUnusedExtraSplit, isUpsideDownMode, isValidModeAndMap} from "./data/valid-modes";
import {redrawSplitDisplay, resetOverlay} from "./split-overlay-window";
import {pogoLogName, userDataPathEnd} from "./data/paths";
import log from "electron-log/main";
import {writeGoldPacesIfChanged} from "./file-reading/read-golden-paces";

export class SettingsManager {
    private static instance: SettingsManager | null = null;
    private readonly settingsPath: string;
    private configWindow: BrowserWindow | null = null;
    public currentSettings: Settings;

    private constructor() {
        this.settingsPath = path.join(app.getPath("userData"), "settings.json");
        this.currentSettings = this.loadSettings();

        FileWatcher.getInstance().startWatching(this.currentSettings.pogostuckConfigPath, pogoLogName);
    }

    public static getInstance(): SettingsManager {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager();
        }
        return SettingsManager.instance;
    }

    public initListeners(overlayWindow: BrowserWindow, configWindow: BrowserWindow) {
        const stateTracker = CurrentStateTracker.getInstance();
        const pbSplitTracker = PbSplitTracker.getInstance();
        const goldenSplitsTracker = GoldSplitsTracker.getInstance();
        const indexToNamesMappings = PogoNameMappings.getInstance();

        overlayWindow.on("ready-to-show", () => {
            this.updateFrontendStatus(overlayWindow)
        })

        indexToNamesMappings.switchMap1SplitNames(this.currentSettings.showNewSplitNames)
        ipcMain.handle("load-settings", () => {
            return this.currentSettings;
        });

        ipcMain.handle("option-hide-skipped-splits-changed", (event, hideSplits: boolean) => {
            this.currentSettings.hideSkippedSplits = hideSplits;
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            this.saveSettings()
            return this.currentSettings
        });

        ipcMain.handle("option-hide-overlay-when-not-active-changed", (event, hideWindow: boolean) => {
            this.currentSettings.hideWindowWhenPogoNotActive = hideWindow;
            if (!hideWindow) overlayWindow.show();
            this.saveSettings()
            return this.currentSettings
        });
        ipcMain.handle('only-diff-colored-changed', (event, colorOnlyDiffs: boolean) => {
            this.currentSettings.onlyDiffsColored = colorOnlyDiffs;
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
        });
        ipcMain.handle("option-launch-pogo-on-startup", (event, launchPogoOnStartup: boolean) => {
            this.currentSettings.launchPogoOnStartup = launchPogoOnStartup;
            this.saveSettings()
            return this.currentSettings
        });
        ipcMain.handle("option-show-new-split-names-changed", (event, showNewSplits: boolean) => {
            this.currentSettings.showNewSplitNames = showNewSplits;
            indexToNamesMappings.switchMap1SplitNames(showNewSplits)
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            this.saveSettings()
            return this.currentSettings
        });
        ipcMain.handle("option-click-through-overlay-changed", (event, clickThroughOverlay: boolean) => {
            this.currentSettings.clickThroughOverlay = clickThroughOverlay;
            overlayWindow.setIgnoreMouseEvents(clickThroughOverlay);
            this.saveSettings()
            return this.currentSettings
        });
        ipcMain.handle("steam-user-data-path-changed", (event, steamUserDataPath: string) => {
            const settingsTxtPath = path.join(steamUserDataPath, ...userDataPathEnd)
            if (!existsSync(settingsTxtPath)) {
                log.info(`Steam user data path does not exist: settingsPath calculated: ${settingsTxtPath} for steamUserDataPath: ${steamUserDataPath}`);
                const steamUserDataPathExists = existsSync(steamUserDataPath);
                const settingsPathExists = existsSync(settingsTxtPath);
                log.info(`Steam user data path exists: ${steamUserDataPathExists}, settings.txt exists: ${settingsPathExists}`);
                return this.currentSettings;
            }
            this.currentSettings.pogostuckSteamUserDataPath = steamUserDataPath;
            log.info(`PogoStuck Steam user data path changed to: ${steamUserDataPath}`);
            pbSplitTracker.updatePbSplitsFromFile(configWindow, overlayWindow);
            goldenSplitsTracker.updateGoldSplitsIfInPbSplits();
            writeGoldSplitsIfChanged(configWindow)
            writeGoldPacesIfChanged(configWindow)
            const mapNum = stateTracker.getCurrentMap()
            const modeNum = stateTracker.getCurrentMode();
            resetOverlay(mapNum, modeNum, overlayWindow);
            this.saveSettings()
            this.updateFrontendStatus(overlayWindow)
            return this.currentSettings
        });
        ipcMain.handle("pogostuck-config-path-changed", (event, pogostuckConfPath: string) => {
            if (!existsSync(pogostuckConfPath)) {
                log.info(`PogoStuck config path does not exist: ${pogostuckConfPath}`);
                return this.currentSettings;
            }
            stateTracker.updatePathsValidity();
            log.info(`PogoStuck config path changed to: ${pogostuckConfPath}`);
            this.currentSettings.pogostuckConfigPath = pogostuckConfPath;
            FileWatcher.getInstance().startWatching(this.currentSettings.pogostuckConfigPath, pogoLogName);
            this.saveSettings()
            this.updateFrontendStatus(overlayWindow)
            return this.currentSettings
        });
        ipcMain.handle('pogo-path-is-valid', () => {
            return existsSync(this.currentSettings.pogostuckConfigPath);
        })
        ipcMain.handle("skip-splits-changed", (event, skippedSplits: {mode:number, skippedSplitIndices: number[]}) => {
            log.info("skippedSplits", skippedSplits);
            const oldSkippedSplits = this.currentSettings.skippedSplits
            const existingIndex = oldSkippedSplits.findIndex(s => s.mode === skippedSplits.mode);
            if (existingIndex !== -1) {
                log.info("updating existing skipped splits", JSON.stringify(skippedSplits));
                oldSkippedSplits[existingIndex].skippedSplitIndices = skippedSplits.skippedSplitIndices;
            } else {
                log.info("putting new skipped splits", JSON.stringify(skippedSplits));
                oldSkippedSplits.push(skippedSplits);
            }
            goldenSplitsTracker.updateGoldSplitsIfInPbSplits()
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            this.saveSettings()
            return this.currentSettings;
        });
        ipcMain.handle('enable-background-color-changed', (event, enableBackgroundColor: boolean) => {
            this.currentSettings.enableBackgroundColor = enableBackgroundColor;
            overlayWindow.webContents.send('change-background', enableBackgroundColor ? this.currentSettings.backgroundColor : null);
            this.saveSettings();
            return this.currentSettings;
        });

        ipcMain.handle('background-color-changed', (event, bgCol: string) => {
            this.currentSettings.backgroundColor = bgCol;
            if (this.currentSettings.enableBackgroundColor)
                overlayWindow.webContents.send('change-background', bgCol);
            this.saveSettings();
            return this.currentSettings;
        });

        ipcMain.handle('get-split-path', (event, mode: number) => {
            const steamUserDataPathIsValid = existsSync(path.join(this.currentSettings.pogostuckSteamUserDataPath, ...userDataPathEnd));
            if (!steamUserDataPathIsValid) {
                log.info(`Querying split path, but steam user data path is not valid: ${this.currentSettings.pogostuckSteamUserDataPath}`);
                return []
            }
            const splitAmount =  pbSplitTracker.getSplitAmountForMode(mode)
            return this.getSplitIndexPath(mode, splitAmount);
        });
    }

    public getSplitIndexPath( mode: number, splitAmount: number ): {from: number, to: number}[] {
        // some of the newer map 1 modes have a unused split for some reason :(
        if (hasUnusedExtraSplit(mode) && splitAmount === 10) {
            splitAmount = 9
            log.info(`Split amount for mode ${mode} is 10, but it should be 9, so adjusting it.`);
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
            if (typeof settings.hideWindowWhenPogoNotActive === "undefined") {
                settings.hideWindowWhenPogoNotActive = true;
            }
            if (settings.pogostuckSteamUserDataPath) {
                // Regex: entfernt '688130/remote' oder '688130\\remote' am Ende des Strings
                settings.pogostuckSteamUserDataPath = settings.pogostuckSteamUserDataPath.trim().replace(/([\\/])?688130[\\/]+remote([\\/])?$/ , "");
            }
            return settings;
        } else {
            return {
                pogostuckConfigPath: "",
                pogostuckSteamUserDataPath: "",
                // design
                hideSkippedSplits: false,
                onlyDiffsColored: false,
                showNewSplitNames: true,
                clickThroughOverlay: false,

                enableBackgroundColor: false,
                backgroundColor: "#000000",

                hideWindowWhenPogoNotActive: true,

                // split skip
                skippedSplits: [],

                launchPogoOnStartup: false
            };
        }
    }

    public updateMapAndModeInConfig(mapNum: number, modeNum: number, mainWindow: BrowserWindow) {
        if (!isValidModeAndMap(mapNum, modeNum)) {
            return;
        }
        mainWindow.webContents.send("map-and-mode-changed", {map: mapNum, mode: modeNum});
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

    private updateFrontendStatus(overlayWindow: BrowserWindow) {
        const statusMessage = this.createStatusMessage();
        overlayWindow.webContents.send("status-changed", statusMessage);
    }

    private createStatusMessage(): string {
        const stateTracker = CurrentStateTracker.getInstance();
        let msg = "Config Status\n"
        const pogoConfigPathIsValid = stateTracker.pogoPathIsValid();
        const steamUserDataPathIsValid = stateTracker.userDataPathIsValid();
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

    public pogostuckSteamPath() {
        return this.currentSettings.pogostuckConfigPath;
    }

    public launchPogoOnStartup() {
        return this.currentSettings.launchPogoOnStartup;
    }

    public steamUserDataPath(): string {
        return this.currentSettings.pogostuckSteamUserDataPath;
    }

    public hideSkippedSplits(): boolean {
        return this.currentSettings.hideSkippedSplits;
    }

    public onlyDiffColored() {
        return this.currentSettings.onlyDiffsColored;
    }

    public clickThroughOverlay() {
        return this.currentSettings.clickThroughOverlay;
    }

    public hideWindowWhenPogoNotActive() {
        return this.currentSettings.hideWindowWhenPogoNotActive;
    }

    public updatePogoPath(pogoPath: string, configWindow: BrowserWindow, overlayWindow: BrowserWindow) {
        if (!existsSync(pogoPath)) {
            log.error(`PogoStuck config path does not exist: ${pogoPath}`);
            return;
        }
        const currentStateTracker = CurrentStateTracker.getInstance();
        if (!currentStateTracker.pogoPathIsValid()) {
            this.currentSettings.pogostuckConfigPath = pogoPath;
            log.info(`PogoStuck config path changed to: ${pogoPath}`);
            this.saveSettings();
            currentStateTracker.updatePathsValidity();
            this.updateFrontendStatus(overlayWindow);
            configWindow.webContents.send("pogostuck-config-path-found", pogoPath);
        }

        // check if you can find the userdataPath as well. could be at ../../../userdata/(5-9 digiit number)
        this.attemptToFindUserDataPath(configWindow, overlayWindow)
    }

    public attemptToFindUserDataPath(configWindow: BrowserWindow, overlayWindow: BrowserWindow) {
        log.info(`attempting to find userdata path for PogoStuck`);
        let userDataPathWithNoFile = [...userDataPathEnd].slice(0, -1);
        const pogostuckPath = this.pogostuckSteamPath();
        const userdataRoot = path.join(pogostuckPath, "..", "..", "..", "userdata");

        if (!existsSync(userdataRoot)) {
            log.error(`Could not find userdata root at ${userdataRoot}`);
            return;
        }

        const folders = fs.readdirSync(userdataRoot, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory() && /^\d{5,10}$/.test(dirent.name))
            .map(dirent => dirent.name);

        for (const folder of folders) {
            const potentialPath = path.join(userdataRoot, folder, ...userDataPathWithNoFile);
            if (existsSync(potentialPath)) {
                log.info(`Found userdata path at ${potentialPath}, updating settings.`);
                this.currentSettings.pogostuckSteamUserDataPath = path.join(userdataRoot, folder);
                CurrentStateTracker.getInstance().updatePathsValidity();
                this.saveSettings();
                configWindow.webContents.send("steam-user-data-path-changed", path.join(userdataRoot, folder));
                this.updateFrontendStatus(overlayWindow);
                return;
            }
        }

        log.error(`Could not find valid userdata path in ${userdataRoot}`);
    }
}