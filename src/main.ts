import { app, BrowserWindow } from 'electron'
import * as path from "node:path";

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 100,
        height: 100,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    })

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.on('ready', () => {
    createWindow();
});