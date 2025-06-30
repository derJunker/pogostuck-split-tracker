import path from "path";
import {BrowserWindow, screen} from "electron";


export function openOverlayWindow(mainWindow: BrowserWindow) {
    const overlayHTML = path.join(__dirname, "..", "frontend", "overlay.html");
    const overlayWidth = 700;
    const overlayHeight = 350;

    const overlayWindow = new BrowserWindow({
        width: overlayWidth,
        height: overlayHeight,
        x: screen.getPrimaryDisplay().workArea.width - overlayWidth,
        y: 0,
        parent: mainWindow,
        transparent: true,
        frame: false,
        skipTaskbar: true,
        focusable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
        }
    });
    overlayWindow.setAlwaysOnTop(true, "screen-saver")

    overlayWindow.on("ready-to-show", () => {
        overlayWindow.show();
    })

    overlayWindow.loadURL(overlayHTML).catch((e) => console.error(e));
    overlayWindow.on('closed', () => { /* Handle window close if needed */ });
    return overlayWindow
}