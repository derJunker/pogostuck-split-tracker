import path from "path";
import {BrowserWindow, screen} from "electron";
import ActiveWindow, {WindowInfo} from "@paymoapp/active-window";

let pogostuckIsActiveWindow = false;

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
        focusable: false,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
        }
    });
    overlayWindow.setAlwaysOnTop(true, "screen-saver")
    addPogostuckOpenedListener(overlayWindow)

    overlayWindow.on("ready-to-show", () => {
        if (pogostuckIsActiveWindow)
            overlayWindow.show();
    })

    overlayWindow.loadURL(overlayHTML).catch((e) => console.error(e));
    overlayWindow.on('closed', () => { /* Handle window close if needed */ });
    return overlayWindow
}

function addPogostuckOpenedListener(overlayWindow: BrowserWindow) {
    pogostuckIsActiveWindow = pogostuckIsActive(ActiveWindow.getActiveWindow())
    ActiveWindow.subscribe(windowInfo => {
        const pogostuckWasActive = pogostuckIsActiveWindow;
        pogostuckIsActiveWindow = pogostuckIsActive(windowInfo);
        if (!pogostuckWasActive && pogostuckIsActiveWindow) {
            console.log("Pogostuck is active, showing overlay window");
            overlayWindow.show();
        } else if (pogostuckWasActive && !pogostuckIsActiveWindow) {
            console.log("Pogostuck is not active, hiding overlay window");
            overlayWindow.hide();
        }
    })
}

function pogostuckIsActive(winInfo: WindowInfo | null) : boolean {
    if (!winInfo) return false;
    const isPogostuck = winInfo.title === "Pogostuck" && winInfo.application === "Pogostuck.exe";
    // TODO use "path" attribute to read steam dir of pogostuck for acklog.txt
    pogostuckIsActiveWindow = isPogostuck;
    return isPogostuck;

}