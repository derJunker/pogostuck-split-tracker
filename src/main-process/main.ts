import {app, BrowserWindow, ipcMain, shell} from "electron";
import * as path from "path";
import {FileWatcher} from "./logs-watcher";
import {registerLogEventHandlers} from "./log-event-handler";
import {openOverlayWindow} from "./split-overlay-window";
import {CurrentStateTracker} from "../data/current-state-tracker";
import {initMappings} from "./create-index-mappings";
import {PbSplitTracker} from "../data/pb-split-tracker";
import {GoldSplitsTracker} from "../data/GoldSplitsTracker";
import {readGoldenSplits, writeGoldenSplits, writeGoldSplitsIfChanged} from "./read-golden-splits";
import ActiveWindow from "@paymoapp/active-window";
import { SettingsManager } from "./settings-manager";
import { initListeners as initWindows11Listeners } from './windows11-listeners';
import {initLaunchPogoListener} from "./pogostuck-launcher";

ActiveWindow.initialize();
if (!ActiveWindow.requestPermissions()) {
    console.log('Error: You need to grant screen recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording');
    process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

let logWatcher: FileWatcher = new FileWatcher();
const indexToNamesMappings = initMappings();
const settingsManager = new SettingsManager(logWatcher)
const pbSplitTracker = new PbSplitTracker(settingsManager);
const goldenSplitsTracker = new GoldSplitsTracker(readGoldenSplits(indexToNamesMappings), settingsManager, pbSplitTracker)
writeGoldenSplits(goldenSplitsTracker)

const stateTracker: CurrentStateTracker = new CurrentStateTracker(goldenSplitsTracker, pbSplitTracker, settingsManager);

app.on("ready", () => {

    mainWindow = new BrowserWindow({
        width: 650,
        height: 450,
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
    mainWindow.setMenu(null);
    const indexHTML = path.join(__dirname, "..", "frontend", "index.html");
    mainWindow.loadFile(indexHTML)
    overlayWindow = openOverlayWindow(mainWindow);
    settingsManager.init(overlayWindow, goldenSplitsTracker, stateTracker, pbSplitTracker, indexToNamesMappings)

    registerLogEventHandlers(logWatcher, stateTracker, indexToNamesMappings, pbSplitTracker, goldenSplitsTracker, overlayWindow, settingsManager);
    pbSplitTracker.readPbSplitsFromFile(indexToNamesMappings);
    goldenSplitsTracker.updateGoldSplitsIfInPbSplits(pbSplitTracker, settingsManager);
    writeGoldSplitsIfChanged(goldenSplitsTracker)
    goldenSplitsTracker.initListeners(overlayWindow, indexToNamesMappings, stateTracker);

    initWindows11Listeners();
    initLaunchPogoListener(settingsManager);

    ipcMain.handle("get-mappings", () => indexToNamesMappings.getAllLevels())
    ipcMain.handle("get-pbs", () => goldenSplitsTracker.getPbs())
});
