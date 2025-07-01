import {app, BrowserWindow, ipcMain} from "electron";
import {existsSync, writeFileSync} from "fs";
import * as path from "path";
import {openSettingsWindow} from "./settings-window";
import {Settings} from "../types/settings";
import {FileWatcher} from "./logs-watcher";
import {registerLogEventHandlers} from "./log-event-handler";
import {openOverlayWindow} from "./split-overlay-window";
import {CurrentStateTracker} from "../data/current-state-tracker";
import {initMappings} from "./create-index-mappings";
import {PogoLevel} from "../types/pogo-index-mapping";
import {PogoNameMappings} from "../data/pogo-name-mappings";
import {PbSplitTracker} from "../data/pb-split-tracker";
import {GoldSplitsTracker} from "../data/GoldSplitsTracker";
import {readGoldenSplits} from "./read-golden-splits";

const settingsPath = path.join(app.getPath("userData"), "settings.json");

let currentSettings: Settings | null = null;
let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

let logWatcher: FileWatcher = new FileWatcher();
const stateTracker: CurrentStateTracker = new CurrentStateTracker();
const indexToNamesMappings = initMappings();
const pbSplitTracker = new PbSplitTracker();

const goldenSplitsTracker = new GoldSplitsTracker(readGoldenSplits())

app.on("ready", () => {

    mainWindow = new BrowserWindow({
        width: 600,
        height: 400,
        show: false,
        webPreferences: {
            preload: __dirname + '/preload.js',
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    const indexHTML = path.join(__dirname, "..", "frontend", "index.html");
    mainWindow.loadFile(indexHTML)
    overlayWindow = openOverlayWindow(mainWindow);
    registerLogEventHandlers(logWatcher, stateTracker, indexToNamesMappings, pbSplitTracker, overlayWindow);

    initSettingsListeners()
    currentSettings = loadSettings();
    pbSplitTracker.readPbSplitsFromFile(path.join(currentSettings.pogostuckSteamUserDataPath, "settings.txt"), indexToNamesMappings);


    logWatcher.startWatching(currentSettings.pogostuckConfigPath, "acklog.txt");
});

function initSettingsListeners() {
    ipcMain.on("open-settings", () => {
        if (mainWindow) openSettingsWindow(mainWindow);
    })

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
        };
    }
}