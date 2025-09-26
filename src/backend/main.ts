import * as path from "path";
import ActiveWindow from "@paymoapp/active-window";
import log from 'electron-log/main';
import {app, BrowserWindow, ipcMain, shell} from "electron";

import {registerLogEventHandlers} from "./logging/log-event-handler";
import {addPogostuckOpenedListener, openOverlayWindow} from "./split-overlay-window";
import {CurrentStateTracker} from "./data/current-state-tracker";
import {PbSplitTracker} from "./data/pb-split-tracker";
import {GoldSplitsTracker} from "./data/gold-splits-tracker";
import {readGoldenSplits, writeGoldenSplits, writeGoldSplitsIfChanged} from "./file-reading/read-golden-splits";
import { SettingsManager } from "./settings-manager";
import {initListeners, initListeners as initWindows11Listeners} from './windows11-listeners';
import {initLaunchPogoListener, launchPogostuckIfNotOpenYet} from "./pogostuck-launcher";
import {UserDataReader} from "./data/user-data-reader";
import { VERSION } from "../version";
import {getNewReleaseInfoIfOutdated, initUpdateBtnListener} from "./version-update-checker";
import {GoldPaceTracker} from "./data/gold-pace-tracker";
import {readGoldenPaces, writeGoldenPace, writeGoldPacesIfChanged} from "./file-reading/read-golden-paces";
import fs from "fs";
import {BackupGoldSplitTracker} from "./data/backup-gold-split-tracker";
import {CustomModeHandler} from "./data/custom-mode-handler";
import {PogoNameMappings} from "./data/pogo-name-mappings";
import { net } from "electron";

// @ts-ignore
import WindowStateManager from 'electron-window-state-manager';

log.initialize();
log.info(`Junker's Split Tracker v${VERSION} is starting...`);

ActiveWindow.initialize();
if (!ActiveWindow.requestPermissions()) {
    log.error('You need to grant screen recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording');
    process.exit(0);
}

let configWindow: BrowserWindow;
let overlayWindow: BrowserWindow;

const indexToNamesMappings = PogoNameMappings.getInstance();
const userDataReader = UserDataReader.getInstance();
const goldSplitsTracker = GoldSplitsTracker.getInstance(readGoldenSplits())
writeGoldenSplits()
const goldPaceTracker = GoldPaceTracker.getInstance(readGoldenPaces());
writeGoldenPace()
const backupGoldTracker = BackupGoldSplitTracker.getInstance()
backupGoldTracker.loadBackups()

const settingsManager = SettingsManager.getInstance()
if (settingsManager.launchPogoOnStartup())
    launchPogostuckIfNotOpenYet().then(() => log.debug("PogoStuck launched on startup."));

app.on("ready", async () => {
    log.info(`App is ready. Initializing main window...`);
    let configWindowState = new WindowStateManager("ConfigWindow",{
        defaultWidth: 950,
        defaultHeight: 800,
    });

    configWindow = new BrowserWindow({
        x: configWindowState.x,
        y: configWindowState.y,
        width: configWindowState.width,
        height: configWindowState.height,
        show: true,
        autoHideMenuBar: true,
        thickFrame: true,
        webPreferences: {
            preload: __dirname + '/preload.js',
            contextIsolation: true,
            nodeIntegration: false
        },
        title: "Junker's Split Tracker - v" + VERSION,
        icon: path.join(__dirname, '..', 'frontend', 'assets', 'clipboard.ico'),
        titleBarStyle: "hidden",
        // expose window controls in Windows/Linux
        ...(process.platform !== "darwin"
            ? {
                titleBarOverlay: {
                    color: "#000000",            // background color under controls
                    symbolColor: "#ffffff",      // color of the traffic-light buttons
                    height: 30                   // overlay height (optional)
                }
            }
            : {}),
    });

    configWindow.on("moved", async () => {
        log.debug(`config window moved, saving position: (${configWindow.getPosition().join(', ')})`);
        configWindowState.saveState(configWindow)
    })
    configWindow.on("resized", async () => {
        log.debug(`config window resized, saving size: (${configWindow.getSize().join(', ')})`);
        configWindowState.saveState(configWindow)
    })
    // configWindow.setMenu(null);

    const indexHTML = path.join(__dirname, "..", "frontend", "index.html");
    configWindow.loadFile(indexHTML).then(async () => {})

    overlayWindow = openOverlayWindow();
    CustomModeHandler.getInstance().initListeners(overlayWindow, configWindow);
    settingsManager.initListeners(overlayWindow, configWindow)

    addPogostuckOpenedListener(overlayWindow, configWindow)
    CurrentStateTracker.getInstance().updatePathsValidity()
    initLaunchPogoListener();

    registerLogEventHandlers(overlayWindow, configWindow);
    PbSplitTracker.getInstance().updatePbSplitsFromFile(configWindow, overlayWindow);
    goldSplitsTracker.updateGoldSplitsIfInPbSplits();
    goldPaceTracker.updateGoldPacesIfInPbSplits()
    writeGoldSplitsIfChanged(configWindow)
    writeGoldPacesIfChanged(configWindow)

    goldSplitsTracker.initListeners(overlayWindow, indexToNamesMappings);
    goldPaceTracker.initListeners();
    userDataReader.initListeners();
    backupGoldTracker.initListeners()
    initWindows11Listeners();

    // I chose against this being parent window to overlayWindow so you can capture it for streaming or sth
    configWindow.on('close', () => {
        log.info(`Closing config window at position (${configWindow.getPosition().join(', ')}) with size (${configWindow.getSize().join(', ')})`);
        configWindowState.saveState(configWindow)
        overlayWindow.close()
    });

    initUpdateBtnListener()
    configWindow.webContents.on('did-finish-load', () => {
        getNewReleaseInfoIfOutdated().then(releaseInfo => {
            if (releaseInfo) {
                configWindow!.webContents.send('new-release-available', releaseInfo);
            }
        })
    });

    ipcMain.handle('open-appdata-explorer', () => shell.openPath(app.getPath("userData")))

    ipcMain.handle('recent-logs', () => {
        const logFilePath = path.join(app.getPath("userData"), "logs", "main.log");
        if (!fs.existsSync(logFilePath)) {
            log.error(`Log file does not exist: ${logFilePath}`);
            return "";
        }
        try {
            let recentLogs = fs.readFileSync(logFilePath, 'utf-8');
            recentLogs = recentLogs.split("\n").slice(-3000).join("\n");
            log.info(`Recent logs fetched, lines: ${recentLogs.split("\n").length}`);
            return recentLogs;
        } catch (error) {
            log.error("Error reading recent logs:", error);
            return "";
        }
    })

    ipcMain.handle('get-version', () => VERSION)

    ipcMain.handle('get-selected-tab', () => settingsManager.lastOpenedTab())
    ipcMain.handle("get-mappings", () => indexToNamesMappings.getAllLevels())
    ipcMain.handle("get-custom-modes", () => CustomModeHandler.getInstance().getCustomModeInfos())
    ipcMain.handle('open-buy-me-a-coffee', () => shell.openExternal("https://buymeacoffee.com/derjunker"))
});
