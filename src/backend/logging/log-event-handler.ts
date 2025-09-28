import {FileWatcher} from './logs-watcher';
import {CurrentStateTracker} from "../data/current-state-tracker";
import {BrowserWindow} from "electron";
import {PbSplitTracker} from "../data/pb-split-tracker";
import {GoldSplitsTracker} from "../data/gold-splits-tracker";
import {writeGoldSplitsIfChanged} from "../file-reading/read-golden-splits";
import {SettingsManager} from "../settings-manager";
import {isUpsideDownMode, isValidModeAndMap} from "../data/valid-modes";
import {resetOverlay} from "../split-overlay-window";
import {writeGoldPacesIfChanged} from "../file-reading/read-golden-paces";
import log from "electron-log/main";
import {BackupGoldSplitTracker} from "../data/backup-gold-split-tracker";
import {writeUserStatsIfChanged} from "../file-reading/read-user-stats";
import {UserStatTracker} from "../data/user-stat-tracker";

export function registerLogEventHandlers(overlayWindow: BrowserWindow, configWindow: BrowserWindow) {
    // The holy mother of singleton-definitions
    const stateTracker = CurrentStateTracker.getInstance();
    const fileWatcher = FileWatcher.getInstance();
    const settingsManager = SettingsManager.getInstance();
    const pbSplitTracker = PbSplitTracker.getInstance();
    const goldenSplitsTracker = GoldSplitsTracker.getInstance();
    const userStatTracker = UserStatTracker.getInstance();

    // map or mode gets logged
    fileWatcher.registerListener(
        /update splits at frame \d+: level_current\((?<map>\d+)\)m\((?<mode>\d+)\) run\((?<run>-?\d+)\)/,
        (match) => {
            const { map, mode, run } = match.groups!;
            const mapNum = parseInt(map);
            let modeNum = parseInt(mode);
            log.info(`Map or mode logged; map: ${mapNum}, mode: ${modeNum} with run: ${run}`);
            const changed = stateTracker.updateMapAndMode(mapNum, modeNum, configWindow);
            if (changed) {
                modeNum = stateTracker.getCurrentMode();
                resetOverlay(mapNum, modeNum, overlayWindow);
                settingsManager.updateMapAndModeInConfig(mapNum, modeNum, configWindow)
            }
        }
    );

    // split gets logged
    fileWatcher.registerListener(
        /playerCheckpointDo\(\) at frame \d+: new checkpoint\((?<checkpoint>\d+)\).*old\((?<old>-?\d+)\)(, map3RouteCurrent(.*))?.*runTimeCurrent\((?<time>\d+\.?\d*)\)/,
        (match) => {
            const map = stateTracker.getCurrentMap();
            const mode = stateTracker.getCurrentMode();
            if (!isValidModeAndMap(map, mode)) {
                return
            }
            const { checkpoint, time } = match.groups!;
            stateTracker.ensuresRunStarted();

            const split = parseInt(checkpoint);
            const timeAsFloat  = parseFloat(time);
            const shouldSkip = settingsManager.splitShouldBeSkipped(mode, split)
            let pbTime;
            if (settingsManager.raceGoldSplits()) {
                if (shouldSkip) {
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
            let {isGoldSplit, isGoldPace} = stateTracker.passedSplit(split, timeAsFloat, shouldSkip)
            if (settingsManager.raceGoldSplits() && shouldSkip) {
                isGoldPace = false
                isGoldSplit = false;
                diff = - timeAsFloat;
            }
            log.info(`Split passed: ${split}, time: ${timeAsFloat}, diff: ${diff}, shouldSkip: ${shouldSkip} pbTime: ${pbTime}`);
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
            // check if player died or sth similar where time is not reset
            if (match.groups!.dontResetTime === "1") {
                return;
            }
            if (!isValidModeAndMap(stateTracker.getCurrentMap(), stateTracker.getCurrentMode())) {
                log.debug(`player reset with invalid map or mode: ${stateTracker.getCurrentMap()}, ${stateTracker.getCurrentMode()}`);
            } else if (stateTracker.isCurrentlyRunning()){
                const map = stateTracker.getCurrentMap();
                const mode = stateTracker.getCurrentMode();
                let lastSplit = stateTracker.getLastSplitTime().split
                lastSplit -= isUpsideDownMode(mode) ? 1 : 0;
                stateTracker.resetRun();
                userStatTracker.increaseResetsAfterSplit(map, mode, lastSplit)
            } else {
                stateTracker.resetRun();
            }
            resetOverlay(stateTracker.getCurrentMap(), stateTracker.getCurrentMode(), overlayWindow);
            onTimeToFileWrite(configWindow);
        }
    )
    // replayInit at frame 3541: replayKuLocal(00000000) | h(0) b(0) statusFlags(4)
    fileWatcher.registerListener(
        /replayInit .*/,
        () => {
            stateTracker.startingRun();
            // TODO if no map or mode is selected backtrack to find map or mode
        }
    )

    // player run finish gets logged
    fileWatcher.registerListener(
        /playerRunFinish at frame .* requestProgressUploadTime\((?<time>\d+)\) <\? bestTime\((?<pbTime>-?\d+)\)/,
        (match) => {
            if (!isValidModeAndMap(stateTracker.getCurrentMap(), stateTracker.getCurrentMode())) {
                return;
            }
            stateTracker.stoppingRun();
            const { time, pbTime } = match.groups!;
            const timeInMS = parseFloat(time)
            const pbTimeInMS = parseFloat(pbTime);
            stateTracker.finishedRun(timeInMS/1000, pbTimeInMS/1000, configWindow, overlayWindow)
            onTimeToFileWrite(configWindow);
        }
    )
    // when going into the menu or closing the window save the golden splits, to reduce lag during play
    fileWatcher.registerListener(
        /OPEN menu at frame \d+|Close window at \d+(?:\.\d+)?/,
        () => {
            onTimeToFileWrite(configWindow);
        }
    );

    fileWatcher.registerListener(
        /levelLoadMenu - START at frame/,
        () => {
            overlayWindow.webContents.send("main-menu-opened")
            stateTracker.updateMapAndMode(-1, -1, configWindow)
            stateTracker.resetRun();
        }
    );

    fileWatcher.registerListener(
        /Close window at/,
        () => {
            log.info("Closing pogostuck window, saving gold splits and paces");
            onTimeToFileWrite(configWindow);
            if(settingsManager.hideWindowWhenPogoNotActive())
                overlayWindow.hide()
            overlayWindow.webContents.send('main-menu-opened') //should probably add another event for that, but currently this just displays the "Pogostuck-Splits Active"
            stateTracker.updateMapAndMode(-1, -1, configWindow)
            stateTracker.resetRun();
        }
    )
}

function onTimeToFileWrite(configWindow: BrowserWindow) {
    writeGoldSplitsIfChanged(configWindow)
    writeGoldPacesIfChanged(configWindow)
    writeUserStatsIfChanged()
    BackupGoldSplitTracker.getInstance().saveBackupsIfChanged();
}

