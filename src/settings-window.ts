import {BrowserWindow} from "electron";
import path from "path";
let settingsWindow: BrowserWindow | null = null;

export function openSettingsWindow(mainWindow: BrowserWindow) {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }
    settingsWindow = new BrowserWindow({
        width: 400,
        height: 600,
        modal: true,
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    const settingsHTML = path.join(__dirname, "settings.html");
    settingsWindow.loadFile(settingsHTML).catch((e) => console.error(e));
    settingsWindow.on('closed', () => { settingsWindow = null; });
}