import {app, BrowserWindow, ipcMain} from "electron";
import {existsSync, writeFileSync} from "fs";
import * as path from "path";
import {Settings} from "../types/settings";
import {FileWatcher} from "./logs-watcher";
import {registerLogEventHandlers} from "./log-event-handler";
import {openOverlayWindow} from "./split-overlay-window";
import {CurrentStateTracker} from "../data/current-state-tracker";
import {initMappings} from "./create-index-mappings";
import {PbSplitTracker} from "../data/pb-split-tracker";
import {GoldSplitsTracker} from "../data/GoldSplitsTracker";
import {readGoldenSplits} from "./read-golden-splits";
import ActiveWindow from "@paymoapp/active-window";

const settingsPath = path.join(app.getPath("userData"), "settings.json");

ActiveWindow.initialize();
if (!ActiveWindow.requestPermissions()) {
    console.log('Error: You need to grant screen recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording');
    process.exit(0);
}

let currentSettings: Settings | null = null;
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

    initSettingsListeners()
    currentSettings = loadSettings();
    pbSplitTracker.readPbSplitsFromFile(path.join(currentSettings.pogostuckSteamUserDataPath, "settings.txt"), indexToNamesMappings);
    goldenSplitsTracker.updateGoldSplitsIfInPbSplits(pbSplitTracker);


    logWatcher.startWatching(currentSettings.pogostuckConfigPath, "acklog.txt");
});

function initSettingsListeners() {
    ipcMain.handle("save-settings", (event, settings: Settings) => {
        logWatcher.startWatching(settings.pogostuckConfigPath, "acklog.txt")
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        currentSettings = settings;
    })

    ipcMain.handle("load-settings", () => {
        currentSettings = loadSettings();
        return currentSettings;
    })
}

function loadSettings(): Settings {
    if (existsSync(settingsPath)) {
        return JSON.parse(require("fs").readFileSync(settingsPath, "utf-8"));
    } else {
        console.log(`Settings file not found at ${settingsPath}. Creating default settings.`);
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