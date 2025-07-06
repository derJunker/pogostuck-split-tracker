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
import {currentSettings, initSettings} from "./settings-manager";

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

app.on("ready", () => {

    mainWindow = new BrowserWindow({
        width: 600,
        height: 400,
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

    initSettings()
    pbSplitTracker.readPbSplitsFromFile(path.join(currentSettings.pogostuckSteamUserDataPath, "settings.txt"), indexToNamesMappings);
    goldenSplitsTracker.updateGoldSplitsIfInPbSplits(pbSplitTracker);


    logWatcher.startWatching(currentSettings.pogostuckConfigPath, "acklog.txt");
});



