import * as path from "path";
import ActiveWindow from "@paymoapp/active-window";
import log from 'electron-log/main';
import {app, BrowserWindow, ipcMain} from "electron";

import {registerLogEventHandlers} from "./logging/log-event-handler";
import {openOverlayWindow} from "./split-overlay-window";
import {CurrentStateTracker} from "./data/current-state-tracker";
import {initMappings} from "./file-reading/create-index-mappings";
import {PbSplitTracker} from "./data/pb-split-tracker";
import {GoldSplitsTracker} from "./data/gold-splits-tracker";
import {readGoldenSplits, writeGoldenSplits, writeGoldSplitsIfChanged} from "./file-reading/read-golden-splits";
import { SettingsManager } from "./settings-manager";
import { initListeners as initWindows11Listeners } from './windows11-listeners';
import {initLaunchPogoListener, launchPogostuckIfNotOpenYet} from "./pogostuck-launcher";
import {UserDataReader} from "./data/user-data-reader";
import windowStateKeeper from "electron-window-state";
import { VERSION } from "../version";
import {getNewReleaseInfoIfOutdated} from "./version-update-checker";
import {GoldPaceTracker} from "./data/gold-pace-tracker";
import {readGoldenPaces, writeGoldenPace, writeGoldPacesIfChanged} from "./file-reading/read-golden-paces";

log.initialize();

ActiveWindow.initialize();
if (!ActiveWindow.requestPermissions()) {
    log.error('You need to grant screen recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording');
    process.exit(0);
}

let configWindow: BrowserWindow;
let overlayWindow: BrowserWindow;

const indexToNamesMappings = initMappings();
const userDataReader = UserDataReader.getInstance();
const goldSplitsTracker = GoldSplitsTracker.getInstance(readGoldenSplits())
writeGoldenSplits()
const goldPaceTracker = GoldPaceTracker.getInstance(readGoldenPaces());
writeGoldenPace()

const settingsManager = SettingsManager.getInstance()
if (settingsManager.launchPogoOnStartup())
    launchPogostuckIfNotOpenYet().then(() => log.debug("PogoStuck launched on startup."));

app.on("ready", async () => {
    let configWindowState = windowStateKeeper({
        defaultWidth: 950,
        defaultHeight: 800,
        file: 'config-window-state.json',
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
    });
    // configWindowState.manage(configWindow);
    configWindow.setMenu(null);

    const indexHTML = path.join(__dirname, "..", "frontend", "index.html");
    configWindow.loadFile(indexHTML).then(async () => {})

    configWindow.webContents.on('did-finish-load', () => {
        getNewReleaseInfoIfOutdated().then(releaseInfo => {
            if (releaseInfo) {
                configWindow!.webContents.send('new-release-available', releaseInfo);
            }
        })
    });

    overlayWindow = openOverlayWindow(configWindow);
    settingsManager.initListeners(overlayWindow, configWindow)
    initLaunchPogoListener();

    registerLogEventHandlers(overlayWindow, configWindow);
    PbSplitTracker.getInstance().updatePbSplitsFromFile();
    goldSplitsTracker.updateGoldSplitsIfInPbSplits();
    goldPaceTracker.updateGoldPacesIfInPbSplits()
    writeGoldSplitsIfChanged(configWindow)
    writeGoldPacesIfChanged(configWindow)

    goldSplitsTracker.initListeners(overlayWindow, indexToNamesMappings);
    goldPaceTracker.initListeners(overlayWindow);
    userDataReader.initListeners();
    initWindows11Listeners();



    ipcMain.handle("get-mappings", () => indexToNamesMappings.getAllLevels())
    configWindow.on('closed', () => { overlayWindow.close() }); // i chose against this being parent window to
    // overlayWindow so you can capture it for streaming or sth
});
