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
        alwaysOnTop: true,
        transparent: true,
        frame: false,
        // no menu stuff
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            // preload: new URL("preload.js", import.meta.url).href
        }
    });

    overlayWindow.on("ready-to-show", () => {
        overlayWindow.show();
    })

    overlayWindow.loadURL(overlayHTML).catch((e) => console.error(e));
    overlayWindow.on('closed', () => { /* Handle window close if needed */ });
}