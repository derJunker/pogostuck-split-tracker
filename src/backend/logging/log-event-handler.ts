import {FileWatcher} from './logs-watcher';
import {CurrentStateTracker} from "../data/current-state-tracker";
import {BrowserWindow} from "electron";
import {PogoNameMappings} from "../data/pogo-name-mappings";
import {PbSplitTracker} from "../data/pb-split-tracker";
import {GoldSplitsTracker} from "../data/gold-splits-tracker";
import {writeGoldSplitsIfChanged} from "../file-reading/read-golden-splits";
import {SettingsManager} from "../settings-manager";
import {isValidModeAndMap} from "../data/valid-modes";
import {resetOverlay} from "../split-overlay-window";
import {writeGoldPacesIfChanged} from "../file-reading/read-golden-paces";
import log from "electron-log/main";

export function registerLogEventHandlers(overlayWindow: BrowserWindow, configWindow: BrowserWindow) {
    const stateTracker = CurrentStateTracker.getInstance();
    const fileWatcher = FileWatcher.getInstance();
    const settingsManager = SettingsManager.getInstance();
    const pbSplitTracker = PbSplitTracker.getInstance();
    const goldenSplitsTracker = GoldSplitsTracker.getInstance();

    // map or mode gets logged
    fileWatcher.registerListener(
        /update splits at frame \d+: level_current\((?<map>\d+)\)m\((?<mode>\d+)\) run\((?<run>-?\d+)\)/,
        (match) => {
            const { map, mode, run } = match.groups!;
            const mapNum = parseInt(map);
            const modeNum = parseInt(mode);
            log.debug(`Map or mode changed to ${mapNum}, ${modeNum} with run ${run}`);
            const changed = stateTracker.updateMapAndMode(mapNum, modeNum);
            if (changed || run === "-1") {
                resetOverlay(mapNum, modeNum, overlayWindow);
                settingsManager.updateMapAndModeInConfig(mapNum, modeNum, configWindow)
            }
        }
    );

    // split gets logged
    fileWatcher.registerListener(
        /playerCheckpointDo\(\) at frame \d+: new checkpoint\((?<checkpoint>\d+)\), old\((?<old>-?\d+)\) runTimeCurrent\((?<time>\d+\.\d+)\), cpTime\((?<overwrittenTime>\d+\.\d+)\)/,
        (match) => {
            const map = stateTracker.getCurrentMap();
            const mode = stateTracker.getCurrentMode();
            if (!isValidModeAndMap(map, mode)) {
                return
            }
            const { checkpoint, old, time, overwrittenTime } = match.groups!;

            const split = parseInt(checkpoint);
            const timeAsFloat  = parseFloat(time);
            let pbTime;
            if (settingsManager.raceGoldSplits()) {
                if (settingsManager.splitShouldBeSkipped(mode, split)) {
                    pbTime = 0;
                } else {
                    const splitAmount = pbSplitTracker.getSplitAmountForMode(mode);
                    const splitIndexPath = settingsManager.getSplitIndexPath(mode, splitAmount);
                    const splitSegment = splitIndexPath.find(seg => seg.to === split)!;
                    const goldSplitsForMode = goldenSplitsTracker.getGoldSplitsForMode(mode)!
                    const goldSplitTime = goldSplitsForMode.goldenSplits.find(info => info.to === splitSegment.to
                        && info.from  === splitSegment.from)?.time || 0;
                    const goldSplitPace = goldenSplitsTracker.calculateGoldSplitPace(mode, split, splitAmount)
                    pbTime = goldSplitPace + goldSplitTime;
                    log.debug(`calculated pbTime ${pbTime} goldSplitTime: ${goldSplitTime}, goldSplitPace: ${goldSplitPace} from ${JSON.stringify(goldSplitsForMode.goldenSplits)}`);
                }
            } else {
                pbTime = pbSplitTracker.getPbTimeForSplit(stateTracker.getCurrentMode(), split);
            }
            const firstTimePass = pbTime === Infinity || pbTime <= 0
            let diff;
            if (firstTimePass) {
                diff = - timeAsFloat;
            } else {
                diff = timeAsFloat - pbTime
            }
            const shouldSkip = settingsManager.splitShouldBeSkipped(stateTracker.getCurrentMode(), split)
            let {isGoldSplit, isGoldPace} = stateTracker.passedSplit(split, timeAsFloat, shouldSkip)
            if (settingsManager.raceGoldSplits() && shouldSkip) {
                isGoldPace = false
                isGoldSplit = false;
                diff = - timeAsFloat;
            }
            log.debug(`Split passed: ${split}, time: ${timeAsFloat}, diff: ${diff}, shouldSkip: ${shouldSkip} pbTime: ${pbTime}`);
            overlayWindow.webContents.send('split-passed', { splitIndex: split, splitTime: timeAsFloat, splitDiff: diff, golden: isGoldSplit, goldPace: isGoldPace, onlyDiffColored: settingsManager.onlyDiffColored()});
            if (isGoldSplit) {
                overlayWindow.webContents.send("golden-split-passed", goldenSplitsTracker.calcSumOfBest(stateTracker.getCurrentMode(),
                    pbSplitTracker.getSplitAmountForMode(stateTracker.getCurrentMode())));
            }
        }
    )

    // player reset gets logged
    fileWatcher.registerListener(
        /playerReset\(\) .*? playerLocalDead\((?<localDead>\d+)\) dontResetTime\((?<dontResetTime>\d+)\) map3IsAGo\((?<map3IsAGo>\d+)\)/,
        (match) => {
            stateTracker.resetRun();
            if (isValidModeAndMap(stateTracker.getCurrentMap(), stateTracker.getCurrentMode()))
                resetOverlay(stateTracker.getCurrentMap(), stateTracker.getCurrentMode(), overlayWindow);
            else
                log.debug(`player reset with invalid map or mode: ${stateTracker.getCurrentMap()}, ${stateTracker.getCurrentMode()}`);
            writeGoldSplitsIfChanged(configWindow)
            writeGoldPacesIfChanged(configWindow)
        }
    )

    // player run finish gets logged
    fileWatcher.registerListener(
        /playerRunFinish at frame .* requestProgressUploadTime\((?<time>\d+)\) <\? bestTime\((?<pbTime>\d+)\)/,
        (match) => {
            if (!isValidModeAndMap(stateTracker.getCurrentMap(), stateTracker.getCurrentMode())) {
                return;
            }
            const { time, pbTime } = match.groups!;
            const timeInMS = parseFloat(time)
            const pbTimeInMS = parseFloat(pbTime);
            stateTracker.finishedRun(timeInMS/1000, pbTimeInMS/1000, configWindow, overlayWindow)
            writeGoldSplitsIfChanged(configWindow)
            writeGoldPacesIfChanged(configWindow)
        }
    )
    // when going into the menu or closing the window save the golden splits, to reduce lag during play
    fileWatcher.registerListener(
        /OPEN menu at frame \d+|Close window at \d+(?:\.\d+)?/,
        () => {
            writeGoldSplitsIfChanged(configWindow)
            writeGoldPacesIfChanged(configWindow)
        }
    );

    fileWatcher.registerListener(
        /levelLoadMenu - START at frame/,
        (match) => {
            overlayWindow.webContents.send("main-menu-opened")

        }
    );

    fileWatcher.registerListener(
        /Close window at/,
        (match) => {
            log.info("Closing pogostuck window, saving gold splits and paces");
            writeGoldSplitsIfChanged(configWindow)
            writeGoldPacesIfChanged(configWindow);
            overlayWindow.webContents.send('main-menu-opened') //should probably add another event for that, but currently this just displays the "Pogostuck-Splits Active"
        }
    )
}

