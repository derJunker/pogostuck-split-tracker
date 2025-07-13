import path from "path";
import {BrowserWindow, screen} from "electron";
import ActiveWindow, {WindowInfo} from "@paymoapp/active-window";
import {PogoNameMappings} from "./data/pogo-name-mappings";
import {PbSplitTracker} from "./data/pb-split-tracker";
import {GoldSplitsTracker} from "./data/gold-splits-tracker";
import {SettingsManager} from "./settings-manager";
import {isValidModeAndMap} from "./data/valid-modes";
import {PbRunInfoAndSoB} from "../types/global";
import log from "electron-log/main";

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
    overlayWindow.setIgnoreMouseEvents(SettingsManager.getInstance().clickThroughOverlay());
    overlayWindow.setAlwaysOnTop(true, "screen-saver")
    addPogostuckOpenedListener(overlayWindow, mainWindow)

    overlayWindow.on("ready-to-show", () => {
        if (pogostuckIsActiveWindow)
            overlayWindow.show();
    })

    overlayWindow.loadURL(overlayHTML).catch((e) => console.error(e));
    overlayWindow.on('closed', () => { /* Handle window close if needed */ });
    return overlayWindow
}

function addPogostuckOpenedListener(overlayWindow: BrowserWindow, mainWindow: BrowserWindow) {
    pogostuckIsActiveWindow = pogostuckIsActive(ActiveWindow.getActiveWindow(), overlayWindow, mainWindow)
    ActiveWindow.subscribe(windowInfo => {
        const pogostuckWasActive = pogostuckIsActiveWindow;
        pogostuckIsActiveWindow = pogostuckIsActive(windowInfo, overlayWindow, mainWindow);
        if (!pogostuckWasActive && pogostuckIsActiveWindow) {
            overlayWindow.show();
        } else if (pogostuckWasActive && !pogostuckIsActiveWindow) {
            overlayWindow.hide();
        }
    })
}

function pogostuckIsActive(winInfo: WindowInfo | null, overlayWindow: BrowserWindow, mainWindow: BrowserWindow) : boolean {
    if (!winInfo) return false;
    const isPogostuck = winInfo.title?.toLowerCase() === "pogostuck" && winInfo.application?.toLowerCase() === "pogostuck.exe";
    // TODO dont hardcode it
    const isThisWindow = (winInfo.title?.toLowerCase() === overlayWindow.title.toLowerCase() || winInfo.title?.toLowerCase() === mainWindow.title.toLowerCase());
    // TODO use "path" attribute to read steam dir of pogostuck for acklog.txt
    pogostuckIsActiveWindow = isPogostuck;
    return isPogostuck || isThisWindow;

}

export function resetOverlay(mapNum: number, modeNum: number, overlayWindow: BrowserWindow) {
    log.info(`Map or mode changed to map ${mapNum}, mode ${modeNum}`);
    if (!isValidModeAndMap(mapNum, modeNum)) {
        return;
    }

    const pbRunInfoAndSoB: PbRunInfoAndSoB = getPbRunInfoAndSoB(mapNum, modeNum)
    overlayWindow.webContents.send('reset-overlay', pbRunInfoAndSoB);
}

export function redrawSplitDisplay(
    mapNum: number,
    modeNum: number,
    overlayWindow: BrowserWindow,
) {
    if (!isValidModeAndMap(mapNum, modeNum))
        return;
    const pbRunInfoAndSoB: PbRunInfoAndSoB = getPbRunInfoAndSoB(mapNum, modeNum);
    log.info(`Backend: Redrawing split display for map ${mapNum}, mode ${modeNum} with PB: ${pbRunInfoAndSoB.pb}, sum of best: ${pbRunInfoAndSoB.sumOfBest}`);
    overlayWindow.webContents.send('redraw-split-display', pbRunInfoAndSoB);
}

function getPbRunInfoAndSoB(
    mapNum: number,
    modeNum: number,
): PbRunInfoAndSoB {
    const pbSplitTracker = PbSplitTracker.getInstance();
    const settingsManager = SettingsManager.getInstance();
    const goldenSplitTracker = GoldSplitsTracker.getInstance();
    const nameMappings = PogoNameMappings.getInstance();

    const mapModeAndSplits = nameMappings.getMapModeAndSplits(mapNum, modeNum);
    const pbSplitTimes = pbSplitTracker.getPbSplitsForMode(modeNum);

    const pbTime = goldenSplitTracker.getPbForMode(modeNum);
    const sumOfBest = goldenSplitTracker.calcSumOfBest(modeNum, pbSplitTracker.getSplitAmountForMode(modeNum));

    log.info(`pbTime for mode ${modeNum} is ${pbTime}, sum of best is ${sumOfBest}`);
    return {
        splits: mapModeAndSplits.splits.map((splitName, i) => ({
            name: splitName,
            split: pbSplitTimes[i]!.split,
            time: pbSplitTimes[i]!.time,
            hide: settingsManager.splitShouldBeSkipped(modeNum, i) && settingsManager.hideSkippedSplits(),
            skipped: settingsManager.splitShouldBeSkipped(modeNum, i)
        })),
        pb: pbTime === Infinity ? -1 : pbTime,
        sumOfBest: sumOfBest,
        settings: settingsManager.currentSettings
    };
}