import {app, BrowserWindow, ipcMain} from "electron";
import * as path from "path";
import {FileWatcher} from "./logs-watcher";
import {registerLogEventHandlers} from "./log-event-handler";
import {openOverlayWindow} from "./split-overlay-window";
import {CurrentStateTracker} from "../data/current-state-tracker";
import {initMappings} from "./create-index-mappings";
import {PbSplitTracker} from "../data/pb-split-tracker";
import {GoldSplitsTracker} from "../data/GoldSplitsTracker";
import {readGoldenSplits} from "./read-golden-splits";
import ActiveWindow from "@paymoapp/active-window";
import { SettingsManager } from "./settings-manager";

ActiveWindow.initialize();
if (!ActiveWindow.requestPermissions()) {
    console.log('Error: You need to grant screen recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording');
    process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

let logWatcher: FileWatcher = new FileWatcher();
const indexToNamesMappings = initMappings();
const goldenSplitsTracker = new GoldSplitsTracker(readGoldenSplits(indexToNamesMappings))
const stateTracker: CurrentStateTracker = new CurrentStateTracker(goldenSplitsTracker);
const pbSplitTracker = new PbSplitTracker();

const settingsManager = new SettingsManager(logWatcher)

app.on("ready", () => {

    mainWindow = new BrowserWindow({
        width: 650,
        height: 450,
        resizable: true,
        show: true,
        autoHideMenuBar: true,
        thickFrame: true,
        webPreferences: {
            preload: __dirname + '/preload.js',
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    const indexHTML = path.join(__dirname, "..", "frontend", "index.html");
    mainWindow.loadFile(indexHTML)
    overlayWindow = openOverlayWindow(mainWindow);
    registerLogEventHandlers(logWatcher, stateTracker, indexToNamesMappings, pbSplitTracker, goldenSplitsTracker, overlayWindow);

    settingsManager.init(overlayWindow, goldenSplitsTracker, stateTracker, pbSplitTracker, indexToNamesMappings)
    pbSplitTracker.readPbSplitsFromFile(path.join(settingsManager.getPogoStuckSteamUserDataPath(), "settings.txt"), indexToNamesMappings);
    goldenSplitsTracker.updateGoldSplitsIfInPbSplits(pbSplitTracker);
    goldenSplitsTracker.initListeners(overlayWindow, goldenSplitsTracker, pbSplitTracker, indexToNamesMappings);

    ipcMain.handle("get-mappings", () => indexToNamesMappings.getAllLevels())
    ipcMain.handle("get-pbs", () => goldenSplitsTracker.getPbs())
});



