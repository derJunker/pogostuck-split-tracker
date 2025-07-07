import path from "path";
import {BrowserWindow, screen} from "electron";
import ActiveWindow, {WindowInfo} from "@paymoapp/active-window";

let pogostuckIsActiveWindow = false;

export function openOverlayWindow(mainWindow: BrowserWindow) {
    const overlayHTML = path.join(__dirname, "..", "frontend", "overlay.html");
    const overlayWidth = 530;
    const overlayHeight = 290;

    const overlayWindow = new BrowserWindow({
        width: overlayWidth,
        height: overlayHeight,
        x: screen.getPrimaryDisplay().workArea.width - overlayWidth,
        y: 0,
        parent: mainWindow,
        transparent: true,
        frame: false,
        show: false,
        resizable: true,
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
            overlayWindow.show();
        } else if (pogostuckWasActive && !pogostuckIsActiveWindow) {
            overlayWindow.hide();
        }
    })
}

function pogostuckIsActive(winInfo: WindowInfo | null) : boolean {
    if (!winInfo) return false;
    const isPogostuck = winInfo.title?.toLowerCase() === "pogostuck" && winInfo.application?.toLowerCase() === "pogostuck.exe";
    // title "Pogo Splits", (Electron) TODO dont hardcode it
    const isThisWindow = (winInfo.title?.toLowerCase() === "pogo splits" || winInfo.title?.toLowerCase() === "pogostuck-split-tracker") && winInfo.application?.toLowerCase().includes("electron");
    // TODO use "path" attribute to read steam dir of pogostuck for acklog.txt
    pogostuckIsActiveWindow = isPogostuck;
    return isPogostuck || isThisWindow;

}