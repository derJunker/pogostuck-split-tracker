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
import {
    pogostuckHasBeenOpenedOnce,
    redrawSplitDisplay,
    resetOverlay
} from "./split-overlay-window";
import {pogoLogName, userDataPathEnd} from "./data/paths";
import log from "electron-log/main";
import {writeGoldPacesIfChanged} from "./file-reading/read-golden-paces";
import {GoldPaceTracker} from "./data/gold-pace-tracker";
import {UserDataReader} from "./data/user-data-reader";
import {execSync} from "child_process";

export class SettingsManager {
    private static instance: SettingsManager | null = null;
    private readonly settingsPath: string;
    public currentSettings: Settings;

    private constructor() {
        this.settingsPath = path.join(app.getPath("userData"), "settings.json");
        this.currentSettings = this.loadSettings();
        this.saveSettings(); // saving if any migrations were done

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
        const goldenPaceTracker = GoldPaceTracker.getInstance();
        const indexToNamesMappings = PogoNameMappings.getInstance();

        let windowsReady = 0;
        const onWindowReady = () => {
            windowsReady++;
            if (windowsReady === 2) {
                log.info(`Both windows are ready, updating frontend status.`);
                this.updateFrontendStatus(overlayWindow, configWindow);
            }
        };

        overlayWindow.on("ready-to-show", onWindowReady);
        configWindow.on("ready-to-show", onWindowReady);



        indexToNamesMappings.switchMap1SplitNames(this.currentSettings.showNewSplitNames)
        ipcMain.handle("load-settings", () => {
            return this.currentSettings;
        });

        ipcMain.handle("option-hide-skipped-splits-changed", (event, hideSplits: boolean) => {
            if (this.currentSettings.hideSkippedSplits === hideSplits)
                return this.currentSettings;
            log.info(`[Setting] 'Hide skipped splits' changed to: ${hideSplits}`);
            this.currentSettings.hideSkippedSplits = hideSplits;
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            this.saveSettings()
            return this.currentSettings
        });

        ipcMain.handle("option-hide-overlay-when-not-active-changed", (event, hideWindow: boolean) => {
            if (this.currentSettings.hideWindowWhenPogoNotActive === hideWindow)
                return this.currentSettings;
            log.info(`[Setting] 'Hide window when PogoStuck is not active' changed to: ${hideWindow}`);
            this.currentSettings.hideWindowWhenPogoNotActive = hideWindow;
            if (!hideWindow) overlayWindow.showInactive();
            this.saveSettings()
            return this.currentSettings
        });
        ipcMain.handle('only-diff-colored-changed', (event, colorOnlyDiffs: boolean) => {
            if (this.currentSettings.onlyDiffsColored === colorOnlyDiffs)
                return this.currentSettings;
            log.info(`[Setting] 'Only diffs colored' changed to: ${colorOnlyDiffs}`);
            this.currentSettings.onlyDiffsColored = colorOnlyDiffs;
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            this.saveSettings();
            return this.currentSettings;
        });
        ipcMain.handle('race-golds-changed', (event, raceGoldSplits: boolean) => {
            if (this.currentSettings.raceGoldSplits === raceGoldSplits)
                return this.currentSettings;
            log.info(`[Setting] 'Race gold splits' changed to: ${raceGoldSplits}`);
            this.currentSettings.raceGoldSplits = raceGoldSplits;
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            resetOverlay(mapNum, modeNum, overlayWindow)
            this.saveSettings()
            return this.currentSettings;
        });
        ipcMain.handle("option-launch-pogo-on-startup", (event, launchPogoOnStartup: boolean) => {
            if (this.currentSettings.launchPogoOnStartup === launchPogoOnStartup)
                return this.currentSettings;
            log.info(`[Setting] 'Launch PogoStuck on startup' changed to: ${launchPogoOnStartup}`);
            this.currentSettings.launchPogoOnStartup = launchPogoOnStartup;
            this.saveSettings()
            return this.currentSettings
        });
        ipcMain.handle("option-show-new-split-names-changed", (event, showNewSplits: boolean) => {
            if (this.currentSettings.showNewSplitNames === showNewSplits)
                return this.currentSettings;
            log.info(`[Setting] 'Show new split names' changed to: ${showNewSplits}`);
            this.currentSettings.showNewSplitNames = showNewSplits;
            indexToNamesMappings.switchMap1SplitNames(showNewSplits)
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            this.saveSettings()
            return this.currentSettings
        });
        ipcMain.handle("option-click-through-overlay-changed", (event, clickThroughOverlay: boolean) => {
            if (this.currentSettings.clickThroughOverlay === clickThroughOverlay)
                return this.currentSettings;
            log.info(`[Setting] 'Click through overlay' changed to: ${clickThroughOverlay}`);
            this.currentSettings.clickThroughOverlay = clickThroughOverlay;
            overlayWindow.setIgnoreMouseEvents(clickThroughOverlay);
            this.saveSettings()
            return this.currentSettings
        });
        ipcMain.handle("steam-path-changed", (event, steamUserDataPath: string) => {
            const settingsTxtPath = path.join(steamUserDataPath, "userdata")
            if (!existsSync(settingsTxtPath)) {
                log.info(`Steam path does not exist: settingsPath calculated: ${settingsTxtPath} for steamUserDataPath: ${steamUserDataPath}`);
                const steamUserDataPathExists = existsSync(steamUserDataPath);
                const settingsPathExists = existsSync(settingsTxtPath);
                log.info(`Steam path exists: ${steamUserDataPathExists}, settings.txt exists: ${settingsPathExists}`);
                return this.currentSettings;
            }
            this.currentSettings.steamPath = steamUserDataPath;
            stateTracker.updatePathsValidity()
            this.updateFrontendStatus(overlayWindow, configWindow)
            if (!stateTracker.steamFriendCodeIsValid() || !stateTracker.steamPathIsValid()) {
                return this.currentSettings;
            }
            log.info(`PogoStuck Steam user data path changed to: ${steamUserDataPath}`);
            this.loadSteamUserdataInfoIntoApplication(stateTracker, pbSplitTracker, goldenSplitsTracker, goldenPaceTracker, configWindow, overlayWindow)
            return this.currentSettings
        });
        ipcMain.handle('steam-friend-code-changed', (event, steamFriendCode: string) => {
            const steamPath = this.currentSettings.steamPath;
            if (steamPath && fs.existsSync(path.join(steamPath, "userdata", steamFriendCode, ...userDataPathEnd))) {
                log.info(`[Setting] 'Steam friend code' changed to: ${steamFriendCode}`);
                this.currentSettings.userFriendCode = steamFriendCode;
                this.saveSettings()
            } else {
                log.error(`Steam friend code ${steamFriendCode} does not exist in steam path: ${steamPath}`);
            }
            stateTracker.updatePathsValidity();
            this.updateFrontendStatus(overlayWindow, configWindow)
            if (!stateTracker.steamFriendCodeIsValid() || !stateTracker.steamPathIsValid()) {
                return this.currentSettings;
            }
            this.loadSteamUserdataInfoIntoApplication(stateTracker, pbSplitTracker, goldenSplitsTracker, goldenPaceTracker, configWindow, overlayWindow)
            return this.currentSettings;
        });
        ipcMain.handle("pogostuck-config-path-changed", (event, pogostuckConfPath: string) => {
            const exists = existsSync(pogostuckConfPath);
            const isDir = fs.statSync(pogostuckConfPath).isDirectory();
            const containsPogostuckExe = isDir && (existsSync(path.join(pogostuckConfPath, "pogostuck.exe")) || existsSync(path.join(pogostuckConfPath, "Pogostuck.exe")));
            if (!exists ||!isDir || !containsPogostuckExe) {
                log.info(`pogostuck path changed but not valid : '${pogostuckConfPath}' exists: ${exists} isDir: ${isDir} containsPogostuckExe: ${containsPogostuckExe}`);
                return this.currentSettings;
            }
            log.info(`PogoStuck config path changed to: ${pogostuckConfPath}`);
            this.currentSettings.pogostuckConfigPath = pogostuckConfPath;
            FileWatcher.getInstance().startWatching(this.currentSettings.pogostuckConfigPath, pogoLogName);
            stateTracker.updatePathsValidity();
            this.attemptToFindUserDataPath(configWindow, overlayWindow)
            this.saveSettings()
            this.updateFrontendStatus(overlayWindow, configWindow)
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
            if (this.currentSettings.enableBackgroundColor === enableBackgroundColor)
                return this.currentSettings;
            log.info(`[Setting] 'Enable background color' changed to: ${enableBackgroundColor}`);
            this.currentSettings.enableBackgroundColor = enableBackgroundColor;
            overlayWindow.webContents.send('change-background', enableBackgroundColor ? this.currentSettings.backgroundColor : null);
            this.saveSettings();
            return this.currentSettings;
        });

        ipcMain.handle('background-color-changed', (event, bgCol: string) => {
            if (this.currentSettings.backgroundColor === bgCol)
                return this.currentSettings;
            log.info(`[Setting] 'Background color' changed to: ${bgCol}`);
            this.currentSettings.backgroundColor = bgCol;
            if (this.currentSettings.enableBackgroundColor)
                overlayWindow.webContents.send('change-background', bgCol);
            this.saveSettings();
            return this.currentSettings;
        });

        ipcMain.handle('get-split-path', (event, mode: number) => {
            const stateTracker = CurrentStateTracker.getInstance();
            const steamPathValid = stateTracker.steamPathIsValid();
            const friendCodeValid = stateTracker.steamFriendCodeIsValid();
            if (!steamPathValid || !friendCodeValid) {
                log.warn(`Querying split path, but steam user data path is not valid; steam path valid:${steamPathValid} friend code valid: ${friendCodeValid}`);
                return []
            }
            const splitAmount =  pbSplitTracker.getSplitAmountForMode(mode)
            return this.getSplitIndexPath(mode, splitAmount);
        });

        ipcMain.handle('language-changed', (event, language: string) => {
            if (this.currentSettings.language === language)
                return this.currentSettings;
            log.info(`[Setting] 'Language' changed to: ${language}`);
            if (language !== 'en' && language !== 'ja') {
                log.error(`Language "${language}" not found!`);
                return;
            }
            this.currentSettings.language = language;
            this.saveSettings()
            return this.currentSettings;
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
            const loadedSettings: any = JSON.parse(require("fs").readFileSync(this.settingsPath, "utf-8"));
            if (typeof loadedSettings.hideWindowWhenPogoNotActive === "undefined")
                loadedSettings.hideWindowWhenPogoNotActive = true;
            if (typeof loadedSettings.steamPath === "undefined" && typeof loadedSettings.pogostuckSteamUserDataPath !== "undefined")
                loadedSettings.steamPath = loadedSettings.pogostuckSteamUserDataPath;
            if (typeof loadedSettings.userFriendCode === "undefined")
                loadedSettings.userFriendCode = "";
            if (loadedSettings.steamPath) {
                if (loadedSettings.steamPath.includes("688130") && loadedSettings.steamPath.includes("remote")) {
                    loadedSettings.steamPath = loadedSettings.steamPath.trim().replace(/([\\/])?688130[\\/]+remote([\\/])?$/, "");
                    log.info(`Migrated steam path from: ${loadedSettings.steamPath} to ${loadedSettings.steamPath}`);
                }
                if (loadedSettings.steamPath.includes(`userdata`)) {
                    const regex = /userdata[\\/](?<steamFriendCode>\d{4,})/;
                    const match: RegExpMatchArray|null = loadedSettings.steamPath.match(regex);
                    if (match) {
                        loadedSettings.userFriendCode = match.groups!.steamFriendCode;
                        loadedSettings.steamPath = loadedSettings.steamPath.replace(regex, "");
                        log.info(`Found steam friend code in steam path: ${loadedSettings.userFriendCode}`);
                    }
                }
            }
            return loadedSettings;
        } else {
            return {
                pogostuckConfigPath: "",
                steamPath: "",
                userFriendCode: "",
                // design
                hideSkippedSplits: false,
                onlyDiffsColored: false,
                raceGoldSplits: false,
                showNewSplitNames: true,
                clickThroughOverlay: false,

                enableBackgroundColor: false,
                backgroundColor: "#000000",

                hideWindowWhenPogoNotActive: true,

                // split skip
                skippedSplits: [],

                launchPogoOnStartup: false,
                language: "ja"
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

    public updateFrontendStatus(overlayWindow: BrowserWindow, configWindow: BrowserWindow) {
        const stateTracker = CurrentStateTracker.getInstance();
        const logsWatcher = FileWatcher.getInstance();
        const settingsManager = SettingsManager.getInstance();
        log.info(`pogostuckHasBeenOpenedOnce: ${pogostuckHasBeenOpenedOnce}, logsDetected: ${logsWatcher.logsHaveBeenDetected()}`);
        const pogoStuckLogPath = path.join(settingsManager.pogostuckSteamPath(), pogoLogName);
        const acklogExists = stateTracker.pogoPathIsValid() && fs.existsSync(pogoStuckLogPath);
        // not pretty but idc
        const lastMsgClose = acklogExists && (() => {
            try {
                const data = fs.readFileSync(pogoStuckLogPath, "utf-8");
                const lines = data.trim().split(/\r?\n/);
                return lines[lines.length - 1].includes("Close window at ");
            } catch (e) {
                log.error(`Failed to read last line of log: ${e}`);
                return null;
            }
        })();
        const tasklist = execSync('tasklist', { encoding: 'utf8' });
        const pogoStuckCurrentlyOpen = tasklist.toLowerCase().includes('pogostuck.exe');
        const valid = (pogostuckHasBeenOpenedOnce && acklogExists) && ((!lastMsgClose && pogoStuckCurrentlyOpen) || (lastMsgClose && !pogoStuckCurrentlyOpen));
        log.info(`checking if all config paths etc are valid`);
        log.info(`opened once: ${pogostuckHasBeenOpenedOnce}, acklogExists: ${acklogExists}, lastMsgClose: ${lastMsgClose}, pogoStuckCurrentlyOpen: ${pogoStuckCurrentlyOpen}, valid: ${valid}`);
        [overlayWindow.webContents, configWindow.webContents].forEach(state =>
            state.send("status-changed", {
                pogoPathValid: stateTracker.pogoPathIsValid(),
                steamPathValid: stateTracker.steamPathIsValid(),
                friendCodeValid: stateTracker.steamFriendCodeIsValid(),
                showLogDetectMessage: pogostuckHasBeenOpenedOnce,
                logsDetected: valid || !pogostuckHasBeenOpenedOnce
            })
        )
    }

    private saveSettings() {
        log.debug("saving settings")
        fs.writeFileSync(this.settingsPath, JSON.stringify(this.currentSettings, null, 2), "utf-8");
    }

    private loadSteamUserdataInfoIntoApplication(stateTracker: CurrentStateTracker, pbSplitTracker: PbSplitTracker, goldenSplitsTracker: GoldSplitsTracker, goldenPaceTracker: GoldPaceTracker, configWindow: BrowserWindow, overlayWindow: BrowserWindow) {
        pbSplitTracker.updatePbSplitsFromFile(configWindow, overlayWindow);
        goldenSplitsTracker.updateGoldSplitsIfInPbSplits();
        goldenPaceTracker.updateGoldPacesIfInPbSplits();
        writeGoldSplitsIfChanged(configWindow)
        writeGoldPacesIfChanged(configWindow)
        const mapNum = stateTracker.getCurrentMap()
        const modeNum = stateTracker.getCurrentMode();
        resetOverlay(mapNum, modeNum, overlayWindow);
        this.saveSettings()
    }

    public pogostuckSteamPath() {
        return this.currentSettings.pogostuckConfigPath;
    }

    public launchPogoOnStartup() {
        return this.currentSettings.launchPogoOnStartup;
    }

    public steamPath(): string {
        return this.currentSettings.steamPath;
    }

    public steamFriendCode(): string {
        return this.currentSettings.userFriendCode;
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

    public raceGoldSplits() {
        return this.currentSettings.raceGoldSplits;
    }

    public updatePogoPath(pogoPath: string, configWindow: BrowserWindow, overlayWindow: BrowserWindow) {
        if (!existsSync(pogoPath)) {
            log.error(`Tried to automatically update Pogo Path, but it does not exist? ${pogoPath}`);
            return;
        }
        const currentStateTracker = CurrentStateTracker.getInstance();
        if (!currentStateTracker.pogoPathIsValid()) {
            this.currentSettings.pogostuckConfigPath = pogoPath;
            log.info(`PogoStuck config path changed to: ${pogoPath}`);
            FileWatcher.getInstance().startWatching(this.currentSettings.pogostuckConfigPath, pogoLogName)
            this.saveSettings();
            currentStateTracker.updatePathsValidity();
            this.updateFrontendStatus(overlayWindow, configWindow);
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
            .filter(dirent => dirent.isDirectory() && /^\d{5,12}$/.test(dirent.name))
            .map(dirent => dirent.name);

        for (const folder of folders) {
            const potentialPath = path.join(userdataRoot, folder, ...userDataPathWithNoFile);
            if (existsSync(potentialPath)) {
                log.info(`Found userdata path at ${potentialPath}, updating settings.`);
                this.currentSettings.steamPath = path.join(userdataRoot, "..");
                this.currentSettings.userFriendCode = folder;
                CurrentStateTracker.getInstance().updatePathsValidity();
                this.saveSettings();
                configWindow.webContents.send("steam-user-data-path-found", path.join(userdataRoot, folder));
                configWindow.webContents.send("steam-friend-code-found", path.join(userdataRoot, folder));
                this.updateFrontendStatus(overlayWindow, configWindow);
                const pbSplitTracker = PbSplitTracker.getInstance();
                pbSplitTracker.updatePbSplitsFromFile(configWindow, overlayWindow)
                GoldSplitsTracker.getInstance().updateGoldSplitsIfInPbSplits();
                GoldPaceTracker.getInstance().updateGoldPacesIfInPbSplits()
                writeGoldSplitsIfChanged(configWindow)
                writeGoldPacesIfChanged(configWindow)

                return;
            }
        }

        log.error(`Could not find valid userdata path in ${userdataRoot}`);
    }
}