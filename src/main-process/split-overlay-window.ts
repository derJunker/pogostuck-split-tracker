import path from "path";
import {BrowserWindow, screen} from "electron";
import ActiveWindow, {WindowInfo} from "@paymoapp/active-window";
import {PogoNameMappings} from "../data/pogo-name-mappings";
import {PbSplitTracker} from "../data/pb-split-tracker";
import {GoldSplitsTracker} from "../data/GoldSplitsTracker";
import {SettingsManager} from "./settings-manager";
import {isValidModeAndMap} from "../data/valid-modes";
import {mapAndModeChanged} from "../types/global";

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

export function onMapOrModeChanged(mapNum: number, modeNum: number, nameMappings: PogoNameMappings, pbSplitTracker: PbSplitTracker,
                                   goldenSplitTracker: GoldSplitsTracker, overlayWindow: BrowserWindow, settingsManager: SettingsManager) {
    console.log(`Map or mode changed to map ${mapNum}, mode ${modeNum}`);
    if (!isValidModeAndMap(mapNum, modeNum)) {
        return;
    }
    const mapModeAndSplits: {
        map: string;
        mode: string;
        splits: string[]
    } = nameMappings.getMapModeAndSplits(mapNum, modeNum);
    const pbSplitTimes: { split: number; time: number }[] = pbSplitTracker.getPbSplitsForMode(modeNum);

    const pbTime = goldenSplitTracker.getPbForMode(modeNum);
    const sumOfBest = goldenSplitTracker.calcSumOfBest(modeNum, pbSplitTracker.getSplitAmountForMode(modeNum));
    console.log(`pbTime for mode ${modeNum} is ${pbTime}, sum of best is ${sumOfBest}`);

    const mapModeAndSplitsWithTimes: mapAndModeChanged = {
        map: mapModeAndSplits.map,
        mode: mapModeAndSplits.mode,
        splits: mapModeAndSplits.splits
            .map((splitName, i) => {
                return {
                    name: splitName,
                    split: pbSplitTimes[i]!.split,
                    time: pbSplitTimes[i]!.time,
                    hide: settingsManager.splitShouldBeSkipped(modeNum, i) && settingsManager.getHideSkippedSplits(),
                    skipped: settingsManager.splitShouldBeSkipped(modeNum, i)
                }
            }),
        pb: pbTime === Infinity ? -1 : pbTime,
        sumOfBest: sumOfBest,
    };
    overlayWindow.webContents.send('map-or-mode-changed', mapModeAndSplitsWithTimes);
}