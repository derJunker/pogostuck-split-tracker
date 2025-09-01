import path from "path";
import {BrowserWindow, screen} from "electron";
import ActiveWindow, {WindowInfo} from "@paymoapp/active-window";
import {PogoNameMappings} from "./data/pogo-name-mappings";
import {PbSplitTracker} from "./data/pb-split-tracker";
import {GoldSplitsTracker} from "./data/gold-splits-tracker";
import {SettingsManager} from "./settings-manager";
import {isUpsideDownMode, isValidModeAndMap} from "./data/valid-modes";
import {PbRunInfoAndSoB} from "../types/global";
import log from "electron-log/main";
import windowStateKeeper from "electron-window-state";
import {CurrentStateTracker} from "./data/current-state-tracker";
import {FileWatcher} from "./logging/logs-watcher";
import {Split} from "../types/mode-splits";

let correctWindowForOverlayInFocus = false;
export let pogostuckHasBeenOpenedOnce = false;

export function openOverlayWindow(mainWindow: BrowserWindow) {
    const overlayHTML = path.join(__dirname, "..", "frontend", "overlay.html");
    const overlayWidth = 530;
    const overlayHeight = 300;

    const overlayState = windowStateKeeper({
        defaultWidth: overlayWidth,
        defaultHeight: overlayHeight,
        file: 'overlay-window-state.json',
    })

    const x = overlayState.x !== undefined ? overlayState.x : screen.getPrimaryDisplay().workArea.width - overlayWidth;
    const y = overlayState.y !== undefined ? overlayState.y : 0;

    const overlayWindow = new BrowserWindow({
        width: overlayState.width,
        height: overlayState.height,
        x: x,
        y: y,
        transparent: true,
        frame: false,
        show: false,
        resizable: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
        },
        title: "split-overlay",
        icon: path.join(__dirname, '..', 'frontend', 'assets', 'clipboard.ico'),
    });
    overlayState.manage(overlayWindow)
    overlayWindow.setIgnoreMouseEvents(SettingsManager.getInstance().clickThroughOverlay());
    overlayWindow.setAlwaysOnTop(true, "screen-saver")
    addPogostuckOpenedListener(overlayWindow, mainWindow)

    overlayWindow.on("ready-to-show", () => {
        if (correctWindowForOverlayInFocus || !SettingsManager.getInstance().hideWindowWhenPogoNotActive())
            overlayWindow.showInactive();
    })

    overlayWindow.loadURL(overlayHTML).catch((e) => console.error(e));
    overlayWindow.on('close', () => {
        log.info(`Closing overlay window at position (${overlayWindow.getPosition().join(', ')}) with size (${overlayWindow.getSize().join(', ')})`);
        overlayState.saveState(overlayWindow)
    })
    return overlayWindow
}

function addPogostuckOpenedListener(overlayWindow: BrowserWindow, configWindow: BrowserWindow) {
    ActiveWindow.subscribe(windowInfo => {
        onActiveWindowChanged(overlayWindow, configWindow, windowInfo);
    })
    onActiveWindowChanged(overlayWindow, configWindow, ActiveWindow.getActiveWindow())
}

function onActiveWindowChanged(overlayWindow: BrowserWindow, configWindow: BrowserWindow, windowInfo: WindowInfo|null) {
    const showWindowEvenWhenNotActive = !SettingsManager.getInstance().hideWindowWhenPogoNotActive()
    const pogostuckWasActive = correctWindowForOverlayInFocus;
    const { pogoIsActive, configIsActive } = pogostuckIsActive(windowInfo, overlayWindow, configWindow);
    correctWindowForOverlayInFocus = pogoIsActive || configIsActive;
    if (pogoIsActive) {
        pogostuckHasBeenOpenedOnce = true;
        const logsWatcher = FileWatcher.getInstance();
        if (!logsWatcher.logsHaveBeenDetected()) {
            log.warn("Pogostuck window detected but no logs detected yet. Most likely pogostuck is not run with '-diag'");
        }
        const settingsManager = SettingsManager.getInstance();
        settingsManager.updateFrontendStatus(overlayWindow, configWindow)
    }
    if ((!pogostuckWasActive && correctWindowForOverlayInFocus) || (!overlayWindow.isVisible() && showWindowEvenWhenNotActive)) {
        overlayWindow.showInactive();
    } else if (pogostuckWasActive && !correctWindowForOverlayInFocus && !showWindowEvenWhenNotActive) {
        overlayWindow.hide();
    }
}

function pogostuckIsActive(winInfo: WindowInfo | null, overlayWindow: BrowserWindow, mainWindow: BrowserWindow) : {
    pogoIsActive: boolean;
    configIsActive: boolean;
} {
    if (!winInfo) return {pogoIsActive: false, configIsActive: false};
    const isPogostuck = winInfo.title?.toLowerCase() === "pogostuck" && winInfo.application?.toLowerCase() === "pogostuck.exe";
    const isThisWindow = (winInfo.title?.toLowerCase() === overlayWindow.title.toLowerCase() || winInfo.title?.toLowerCase() === mainWindow.title.toLowerCase());
    const configPathsValid = CurrentStateTracker.getInstance().configPathsAreValid()
    // TODO put back in
    // log.debug(`checking if pogostuck is active: ${isPogostuck}, isThisWindow: ${isThisWindow}, configPathsValid: ${configPathsValid}`);
    if (isPogostuck && !configPathsValid) {
        const settingsManager = SettingsManager.getInstance();
        // path is something like ... \common\Pogostuck\pogostuck.exe, i want to remove the pogostuck.exe part
        const path = winInfo.path.replace(/pogostuck\.exe/i, "");
        settingsManager.updatePogoPath(path, mainWindow, overlayWindow)
    }
    return {pogoIsActive: isPogostuck, configIsActive: isThisWindow};
}

export function resetOverlay(mapNum: number, modeNum: number, overlayWindow: BrowserWindow) {
    log.info(`Resetting Overlay for map ${mapNum}, mode ${modeNum}`);
    const stateTracker = CurrentStateTracker.getInstance();
    if (!isValidModeAndMap(mapNum, modeNum) || !stateTracker.steamFriendCodeIsValid() || !stateTracker.steamPathIsValid()) {
        log.warn(`Cannot reset overlay for map ${mapNum}, mode ${modeNum} because either map or mode is invalid or steam path/friend code is not valid.`);
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
    const stateTracker = CurrentStateTracker.getInstance();
    if (!isValidModeAndMap(mapNum, modeNum) || !stateTracker.steamFriendCodeIsValid() || !stateTracker.steamPathIsValid()) {
        log.warn(`Cannot redraw overlay for map ${mapNum}, mode ${modeNum} because either map or mode is invalid or steam path/friend code is not valid.`);
        return;
    }
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
    let pbSplitTimes = pbSplitTracker.getPbSplitsForMode(modeNum);

    if (settingsManager.raceGoldSplits()) {
        const splitAmount = mapModeAndSplits.splits.length;
        const splitPath = settingsManager.getSplitIndexPath(modeNum, splitAmount);
        pbSplitTimes = []
        let sum = 0;
        const isUD = isUpsideDownMode(modeNum)
        if (isUD) {
            for (let i = splitAmount; i >= -1; i--) {
                sum = sumUpGoldSegments(modeNum, splitPath, pbSplitTimes, goldenSplitTracker, sum, i, isUD)
            }
        } else {
            for (let i = 0; i < splitAmount; i++) {
                sum = sumUpGoldSegments(modeNum, splitPath, pbSplitTimes, goldenSplitTracker, sum, i, isUD)
            }
        }
        log.debug(`pbSplitTimes for mode ${modeNum} with gold splits: ${JSON.stringify(pbSplitTimes)}`);
    }

    const pbTime = goldenSplitTracker.getPbForMode(modeNum);
    const sumOfBest = goldenSplitTracker.calcSumOfBest(modeNum, pbSplitTracker.getSplitAmountForMode(modeNum));

    log.info(`pbTime for mode ${modeNum} is ${pbTime}, sum of best is ${sumOfBest}`);
    return {
        splits: mapModeAndSplits.splits.map((splitName, i) => {
            const splitInfo = pbSplitTimes.find(infos => infos.split === i)
            return ({
                name: splitName,
                split: splitInfo!.split,
                time: splitInfo!.time,
                hide: settingsManager.splitShouldBeSkipped(modeNum, i) && settingsManager.hideSkippedSplits(),
                skipped: settingsManager.splitShouldBeSkipped(modeNum, i)
            })
        }),
        pb: pbTime === Infinity ? -1 : pbTime,
        sumOfBest: sumOfBest,
        settings: settingsManager.currentSettings
    };
}

function sumUpGoldSegments(modeNum: number,
                           splitPath: Split[], pbSplitTimes: {
                                split: number;
                                time: number;
                           }[], goldenSplitTracker: GoldSplitsTracker, sum: number, index: number, isUD: boolean) {
    const getRelevantSplitNum = (segment: Split) => isUD? segment.from : segment.to
    const splitSegment = splitPath.find(seg => getRelevantSplitNum(seg) === index);
    if (!splitSegment) {
        pbSplitTimes.push({
            split: index,
            time: 0
        })
        return sum;
    }
    const splitTime = goldenSplitTracker.getGoldSplitForModeAndSplit(modeNum, splitSegment.from, splitSegment.to) || 0;
    sum += splitTime;
    pbSplitTimes.push({
        split: splitSegment.to,
        time: sum
    });
    return sum;
}