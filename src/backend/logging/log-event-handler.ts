import {FileWatcher} from './logs-watcher';
import {CurrentStateTracker} from "../data/current-state-tracker";
import {BrowserWindow} from "electron";
import {PogoNameMappings} from "../data/pogo-name-mappings";
import {PbSplitTracker} from "../data/pb-split-tracker";
import {GoldSplitsTracker} from "../data/gold-splits-tracker";
import {writeGoldSplitsIfChanged} from "../read-golden-splits";
import {SettingsManager} from "../settings-manager";
import {isValidModeAndMap} from "../data/valid-modes";
import {resetOverlay} from "../split-overlay-window";

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
            const changed = stateTracker.updateMapAndMode(mapNum, modeNum);
            if (changed) {
                resetOverlay(mapNum, modeNum, overlayWindow);
                settingsManager.updateMapAndModeInConfig(mapNum, modeNum, configWindow)
            }
        }
    );

    // split gets logged
    fileWatcher.registerListener(
        /playerCheckpointDo\(\) at frame \d+: new checkpoint\((?<checkpoint>\d+)\), old\((?<old>-?\d+)\) runTimeCurrent\((?<time>\d+\.\d+)\), cpTime\((?<overwrittenTime>\d+\.\d+)\)/,
        (match) => {
            if (!isValidModeAndMap(stateTracker.getCurrentMap(), stateTracker.getCurrentMode())) {
                return
            }
            const { checkpoint, old, time, overwrittenTime } = match.groups!;
            const split = parseInt(checkpoint);
            const timeAsFloat  = parseFloat(time);
            const pbTime = pbSplitTracker.getPbTimeForSplit(stateTracker.getCurrentMode(), split);
            const diff = timeAsFloat - pbTime;
            let wasGolden = false;
            const shouldSkip = settingsManager.splitShouldBeSkipped(stateTracker.getCurrentMode(), split)
            if(!shouldSkip)
                wasGolden = stateTracker.passedSplit(split, timeAsFloat)
            overlayWindow.webContents.send('split-passed', { splitIndex: split, splitTime: timeAsFloat, splitDiff: diff, golden: wasGolden, onlyDiffColored: settingsManager.onlyDiffColored()});
            if (wasGolden) {
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
            writeGoldSplitsIfChanged(configWindow)
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
        }
    )
    // when going into the menu or closing the window save the golden splits, to reduce lag during play
    fileWatcher.registerListener(
        /OPEN menu at frame \d+|Close window at \d+(?:\.\d+)?/,
        () => {
            writeGoldSplitsIfChanged(configWindow)
        }
    );

    fileWatcher.registerListener(
        /levelLoadMenu - START at frame/,
        (match) => {
            overlayWindow.webContents.send("main-menu-opened")
        }
    );
}

