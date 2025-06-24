import { app, BrowserWindow, ipcMain } from "electron";
import { writeFileSync, existsSync } from "fs";
import * as path from "path";
import { openSettingsWindow } from "./settings-window";
import { Settings } from "./types/settings";

const settingsPath = path.join(__dirname, "settings.json");

let mainWindow: BrowserWindow | null = null;

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
    const indexHTML = path.join(__dirname, "/index.html");
    mainWindow
        .loadFile(indexHTML)
        .then(() => {
            // IMPLEMENT FANCY STUFF HERE
        })
        .catch((e) => console.error(e));

    ipcMain.on("open-settings", () => {
        if (mainWindow) openSettingsWindow(mainWindow);
    })

    ipcMain.handle("save-settings", (event, settings: Settings) => {
        if (!existsSync(settingsPath)) {
            writeFileSync(settingsPath, JSON.stringify(settings, null, 2), { flag: "w" });
        } else {
            writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        }
    })

    ipcMain.handle("load-settings", () => {
        if (existsSync(settingsPath)) {
            const settingsData = require(settingsPath);
            return settingsData as Settings;
        } else {
            return {
                pogostuckConfigPath: ""
            }
        }
    })
});