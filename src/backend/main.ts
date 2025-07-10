import {app, BrowserWindow, ipcMain, shell} from "electron";
import * as path from "path";
import {FileWatcher} from "./logging/logs-watcher";
import {registerLogEventHandlers} from "./logging/log-event-handler";
import {openOverlayWindow} from "./split-overlay-window";
import {CurrentStateTracker} from "./data/current-state-tracker";
import {initMappings} from "./create-index-mappings";
import {PbSplitTracker} from "./data/pb-split-tracker";
import {GoldSplitsTracker} from "./data/gold-splits-tracker";
import {readGoldenSplits, writeGoldenSplits, writeGoldSplitsIfChanged} from "./read-golden-splits";
import ActiveWindow from "@paymoapp/active-window";
import { SettingsManager } from "./settings-manager";
import { initListeners as initWindows11Listeners } from './windows11-listeners';
import {initLaunchPogoListener, launchPogostuckIfNotOpenYet} from "./pogostuck-launcher";
import log from 'electron-log/main';
import {UserDataReader} from "./data/user-data-reader";

ActiveWindow.initialize();
if (!ActiveWindow.requestPermissions()) {
    log.error('You need to grant screen recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording');
    process.exit(0);
}

let configWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

let logWatcher: FileWatcher = new FileWatcher();
const indexToNamesMappings = initMappings();
const settingsManager = new SettingsManager(logWatcher)
const userDataReader = UserDataReader.getInstance(settingsManager, indexToNamesMappings);
const pbSplitTracker = new PbSplitTracker();
const goldenSplitsTracker = new GoldSplitsTracker(readGoldenSplits(indexToNamesMappings), settingsManager, pbSplitTracker)
writeGoldenSplits(goldenSplitsTracker)
CurrentStateTracker.getInstance(goldenSplitsTracker, pbSplitTracker, settingsManager)

if (settingsManager.launchPogoOnStartup())
    launchPogostuckIfNotOpenYet(settingsManager).then(() => log.debug("PogoStuck launched on startup."));

app.on("ready", () => {
    log.initialize();
    configWindow = new BrowserWindow({
        width: 680,
        height: 800,
        show: true,
        autoHideMenuBar: true,
        thickFrame: true,
        webPreferences: {
            preload: __dirname + '/preload.js',
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, '..', 'assets', 'clipboard.ico'),
    });
    // configWindow.setMenu(null);
    const indexHTML = path.join(__dirname, "..", "frontend", "index.html");
    configWindow.loadFile(indexHTML)
    overlayWindow = openOverlayWindow(configWindow, settingsManager);
    settingsManager.initListeners(overlayWindow, goldenSplitsTracker, pbSplitTracker, indexToNamesMappings, configWindow)
    initLaunchPogoListener(settingsManager);

    registerLogEventHandlers(logWatcher, indexToNamesMappings, pbSplitTracker, goldenSplitsTracker, overlayWindow, configWindow, settingsManager);
    pbSplitTracker.updatePbSplitsFromFile();
    goldenSplitsTracker.updateGoldSplitsIfInPbSplits(pbSplitTracker, settingsManager);
    writeGoldSplitsIfChanged(goldenSplitsTracker, configWindow)
    goldenSplitsTracker.initListeners(overlayWindow, indexToNamesMappings);

    initWindows11Listeners();

    ipcMain.handle("get-mappings", () => indexToNamesMappings.getAllLevels())
    ipcMain.handle("get-pbs", () => goldenSplitsTracker.getPbs())
    ipcMain.handle("has-fullscreen", () => userDataReader.hasFullScreenSet())
});
