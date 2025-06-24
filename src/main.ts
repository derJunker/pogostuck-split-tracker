import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { openSettingsWindow } from "./settings";

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
});