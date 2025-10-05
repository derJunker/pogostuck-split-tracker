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
import {execSync} from "child_process";
import {Split} from "../types/mode-splits";

export class SettingsManager {
    private static instance: SettingsManager | null = null;
    private readonly settingsPath: string;
    public currentSettings: Settings;
    public noSettingsFileOnStartup: boolean = false;

    private cachedSplitPath: {mode: number, splitIndexPath: Split[]} | null = null;

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

        ipcMain.handle("option-hide-skipped-splits-changed", (_event, hideSplits: boolean) => {
            if (this.currentSettings.hideSkippedSplits !== hideSplits) {
                log.info(`[Setting] 'Hide skipped splits' changed to: ${hideSplits}`);
                this.currentSettings.hideSkippedSplits = hideSplits;
                this.saveSettings()
            }
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            return this.currentSettings
        });

        ipcMain.handle("option-hide-overlay-when-not-active-changed", (_event, hideWindow: boolean) => {
            if (this.currentSettings.hideWindowWhenPogoNotActive !== hideWindow) {
                log.info(`[Setting] 'Hide window when PogoStuck is not active' changed to: ${hideWindow}`);
                this.currentSettings.hideWindowWhenPogoNotActive = hideWindow;
                this.saveSettings()
            }

            if (!hideWindow) overlayWindow.showInactive();
            return this.currentSettings
        });
        ipcMain.handle('only-diff-colored-changed', (_event, colorOnlyDiffs: boolean) => {
            if (this.currentSettings.onlyDiffsColored !== colorOnlyDiffs) {
                this.currentSettings.onlyDiffsColored = colorOnlyDiffs;
                log.info(`[Setting] 'Only diffs colored' changed to: ${colorOnlyDiffs}`);
                this.saveSettings()
            }
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            return this.currentSettings;
        });
        ipcMain.handle('show-reset-counters-changed', (_event, showResetCounters: boolean) => {
            if (this.currentSettings.showResetCounters !== showResetCounters) {
                log.info(`[Setting] 'Show reset counters' changed to: ${showResetCounters}`);
                this.currentSettings.showResetCounters = showResetCounters;
                this.saveSettings()
            }
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            return this.currentSettings;
        });
        ipcMain.handle('reverse-ud-splits', (_event, reverseUDModes: boolean) => {
            if (this.currentSettings.reverseUDModes !== reverseUDModes) {
                log.info(`[Setting] 'Reverse UD Splits' changed to: ${reverseUDModes}`);
                this.currentSettings.reverseUDModes = reverseUDModes;
                this.saveSettings();
            }
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            return this.currentSettings;
        });
        ipcMain.handle('race-golds-changed', (_event, raceGoldSplits: boolean) => {
            if (this.currentSettings.raceGoldSplits !== raceGoldSplits) {
                log.info(`[Setting] 'Race gold splits' changed to: ${raceGoldSplits}`);
                this.currentSettings.raceGoldSplits = raceGoldSplits;
                this.saveSettings()
            }
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            resetOverlay(mapNum, modeNum, overlayWindow)
            return this.currentSettings;
        });
        ipcMain.handle("option-launch-pogo-on-startup", (_event, launchPogoOnStartup: boolean) => {
            if (this.currentSettings.launchPogoOnStartup !== launchPogoOnStartup) {
                log.info(`[Setting] 'Launch PogoStuck on startup' changed to: ${launchPogoOnStartup}`);
                this.currentSettings.launchPogoOnStartup = launchPogoOnStartup;
                this.saveSettings()
            }
            return this.currentSettings
        });
        ipcMain.handle("option-show-new-split-names-changed", (_event, showNewSplits: boolean) => {
            if (this.currentSettings.showNewSplitNames !== showNewSplits) {
                log.info(`[Setting] 'Show new split names' changed to: ${showNewSplits}`);
                this.currentSettings.showNewSplitNames = showNewSplits;
                this.saveSettings()
            }
            indexToNamesMappings.switchMap1SplitNames(showNewSplits)
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            return this.currentSettings
        });
        ipcMain.handle("option-click-through-overlay-changed", (_event, clickThroughOverlay: boolean) => {
            if (this.currentSettings.clickThroughOverlay !== clickThroughOverlay) {
                log.info(`[Setting] 'Click through overlay' changed to: ${clickThroughOverlay}`);
                this.currentSettings.clickThroughOverlay = clickThroughOverlay;
                this.saveSettings()
            }
            overlayWindow.setIgnoreMouseEvents(clickThroughOverlay);
            overlayWindow.webContents.send('click-through-changed', clickThroughOverlay);
            return this.currentSettings
        });
        ipcMain.handle("steam-path-changed", (_event, steamUserDataPath: string) => {
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
        ipcMain.handle('steam-friend-code-changed', (_event, steamFriendCode: string) => {
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
        ipcMain.handle("pogostuck-config-path-changed", (_event, pogostuckConfPath: string) => {
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
        ipcMain.handle("skip-splits-changed", (_event, skippedSplits: {mode:number, skippedSplitIndices: number[]}) => {
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
            this.clearCachedSplitPath(skippedSplits.mode)
            goldenSplitsTracker.updateGoldSplitsIfInPbSplitsForMode(skippedSplits.mode)
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            this.saveSettings()
            return this.currentSettings;
        });
        ipcMain.handle('enable-background-color-changed', (_event, enableBackgroundColor: boolean) => {
            if (this.currentSettings.enableBackgroundColor !== enableBackgroundColor) {
                this.currentSettings.enableBackgroundColor = enableBackgroundColor;
                log.info(`[Setting] 'Enable background color' changed to: ${enableBackgroundColor}`);
                this.saveSettings();
            }
            overlayWindow.webContents.send('change-background', enableBackgroundColor ? this.currentSettings.backgroundColor : null);

            return this.currentSettings;
        });

        ipcMain.handle('show-sob-changed', (_event, showSoB: boolean) => {
            if (this.currentSettings.showSoB !== showSoB) {
                this.currentSettings.showSoB = showSoB;
                log.info(`[Setting] 'Show SoB' changed to: ${showSoB}`);
                this.saveSettings();
            }
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            return this.currentSettings;
        });

        ipcMain.handle('show-pace-changed', (_event, showPace: boolean) => {
            if (this.currentSettings.showPace !== showPace) {
                this.currentSettings.showPace = showPace;
                log.info(`[Setting] 'Show Pace' changed to: ${showPace}`);
                this.saveSettings();
            }
            const modeNum = stateTracker.getCurrentMode();
            const mapNum = stateTracker.getCurrentMap()
            redrawSplitDisplay(mapNum, modeNum, overlayWindow)
            return this.currentSettings;
        });

        ipcMain.handle('background-color-changed', (_event, bgCol: string) => {
            if (this.currentSettings.backgroundColor !== bgCol) {
                this.currentSettings.backgroundColor = bgCol;
                log.info(`[Setting] 'Background color' changed to: ${bgCol}`);
                this.saveSettings();
            }
            if (this.currentSettings.enableBackgroundColor)
                overlayWindow.webContents.send('change-background', bgCol);
            return this.currentSettings;
        });

        ipcMain.handle('get-split-path', (_event, mode: number) => {
            const stateTracker = CurrentStateTracker.getInstance();
            const steamPathValid = stateTracker.steamPathIsValid();
            const friendCodeValid = stateTracker.steamFriendCodeIsValid();
            if (!steamPathValid || !friendCodeValid) {
                log.warn(`Querying split path, but steam user data path is not valid; steam path valid:${steamPathValid} friend code valid: ${friendCodeValid}`);
                return []
            }
            return this.getSplitIndexPath(mode);
        });

        ipcMain.handle('language-changed', (_event, language: string) => {
            if (language !== 'en' && language !== 'ja') {
                log.error(`Language "${language}" not found!`);
                return;
            }
            if (this.currentSettings.lang === language) {
                this.currentSettings.lang = language;
                log.info(`[Setting] 'Language' changed to: ${language}`);
                this.saveSettings()
            }
            return this.currentSettings;
        });

        ipcMain.handle('tab-changed', (_event, tabId: string) => {
            log.debug(`Tab set to ${tabId}`);
            this.currentSettings.lastOpenedTab = tabId;
            this.saveSettings();
        })
    }

    public clearCachedSplitPath(intendedMode?: number) {
        if (intendedMode !== undefined && this.cachedSplitPath?.mode !== intendedMode) {
            return;
        }
        log.info(`cleared cached split path`);
        this.cachedSplitPath = null;
    }

    public getSplitIndexPath( mode: number, splitAmount?: number, forceCalc: boolean = false): Split[] {
        if (this.cachedSplitPath && this.cachedSplitPath.mode === mode && !forceCalc) {
            return this.cachedSplitPath.splitIndexPath;
        }
        if (!splitAmount)
            splitAmount = PbSplitTracker.getInstance().getSplitAmountForMode(mode);
        // some of the newer map 1 modes have a unused split for some reason :(
        if (hasUnusedExtraSplit(mode) && splitAmount === 10) {
            splitAmount = 9
            log.info(`Split amount for mode ${mode} is 10, but it should be 9, so adjusting it.`);
        }
        let splitIndexPath: Split[] = [];
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
        this.cachedSplitPath = {mode, splitIndexPath};
        return splitIndexPath;
    }


    private loadSettings(): Settings {
        if (existsSync(this.settingsPath)) {
            const loadedSettings: any = JSON.parse(require("fs").readFileSync(this.settingsPath, "utf-8"));
            const oldLoadedSettings = {...loadedSettings};
            log.info(`Loaded Settings: ${JSON.stringify(oldLoadedSettings, null, 2)}`);
            if (typeof loadedSettings.hideWindowWhenPogoNotActive === "undefined")
                loadedSettings.hideWindowWhenPogoNotActive = true;
            if (typeof loadedSettings.steamPath === "undefined" && typeof loadedSettings.pogostuckSteamUserDataPath !== "undefined")
                loadedSettings.steamPath = loadedSettings.pogostuckSteamUserDataPath;
            if (typeof loadedSettings.pogostuckSteamUserDataPath !== "undefined")
                loadedSettings.pogostuckSteamUserDataPath = undefined;
            if (typeof loadedSettings.userFriendCode === "undefined")
                loadedSettings.userFriendCode = "";
            if (typeof loadedSettings.reverseUDModes === "undefined")
                loadedSettings.reverseUDModes = false;
            if (typeof loadedSettings.showResetCounters === "undefined")
                loadedSettings.showResetCounters = true;
            if (typeof loadedSettings.showSoB === "undefined")
                loadedSettings.showSoB = true;
            if (typeof loadedSettings.showPace === "undefined")
                loadedSettings.showPace = true;
            // Renamed language to lang, because my stupid ass, saved it the wrong way, so in settings "ja" means it
            // showed it as "en". this is my fix :)
            if (typeof loadedSettings.lang === "undefined") {
                loadedSettings.lang = "en";
                if (typeof loadedSettings.language !== "undefined") {
                    loadedSettings.lang = loadedSettings.language === "en" ? "ja" : "en";
                    loadedSettings.language = undefined;
                }
            }
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
            if (JSON.stringify(oldLoadedSettings) !== JSON.stringify(loadedSettings))
                log.debug(`After migration loaded settings: ${JSON.stringify(loadedSettings, null, 2)}`);
            return loadedSettings;
        } else {
            this.noSettingsFileOnStartup = true;
            return {
                pogostuckConfigPath: "",
                steamPath: "",
                userFriendCode: "",
                // design
                hideSkippedSplits: false,
                onlyDiffsColored: false,
                raceGoldSplits: false,
                showNewSplitNames: true,
                showResetCounters: true,
                reverseUDModes: false,
                clickThroughOverlay: false,
                showSoB: true,
                showPace: true,

                enableBackgroundColor: false,
                backgroundColor: "#000000",

                hideWindowWhenPogoNotActive: true,

                // split skip
                skippedSplits: [],

                launchPogoOnStartup: false,
                lang: "ja",
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

    public lastOpenedTab(): string {
        return this.currentSettings.lastOpenedTab ?? "setup-guide";
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

    public deleteMode(modeIndex: number) {
        // remove the mode from skippedsplits
        this.currentSettings.skippedSplits = this.currentSettings.skippedSplits.filter(s => s.mode !== modeIndex);
        this.saveSettings();
    }
}