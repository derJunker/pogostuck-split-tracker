import {app, BrowserWindow, ipcMain} from "electron";
import {existsSync, writeFileSync} from "fs";
import * as path from "path";
import {openSettingsWindow} from "./settings-window";
import {Settings} from "../types/settings";
import {FileWatcher} from "./logs-watcher";
import {registerLogEventHandlers} from "./log-event-handler";
import {openOverlayWindow} from "./split-overlay-window";
import {CurrentStateTracker} from "../data/current-state-tracker";

const settingsPath = path.join(app.getPath("userData"), "settings.json");

let currentSettings: Settings | null = null;
let mainWindow: BrowserWindow | null = null;

let logWatcher: FileWatcher = new FileWatcher();
let stateTracker: CurrentStateTracker = new CurrentStateTracker();

app.on("ready", () => {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 400,
        webPreferences: {
            preload: __dirname + '/preload.js',
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    registerLogEventHandlers(logWatcher, stateTracker)
    const indexHTML = path.join(__dirname, "..", "index.html");
    mainWindow
        .loadFile(indexHTML)
        .then(() => {
            // IMPLEMENT FANCY STUFF HERE
        })
        .catch((e) => console.error(e));
    openOverlayWindow(mainWindow);

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

    currentSettings = loadSettings();
    logWatcher.startWatching(currentSettings.pogostuckConfigPath, "acklog.txt");
});

function loadSettings(): Settings {
    if (existsSync(settingsPath)) {
        return JSON.parse(require("fs").readFileSync(settingsPath, "utf-8"));
    } else {
        return {
            pogostuckConfigPath: ""
        };
    }
}