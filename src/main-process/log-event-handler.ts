import { FileWatcher } from './logs-watcher';
import {CurrentStateTracker} from "../data/current-state-tracker";
import {BrowserWindow} from "electron";
import {PogoNameMappings} from "../data/pogo-name-mappings";
import {PbSplitTracker} from "../data/pb-split-tracker";
import {GoldSplitsTracker} from "../data/GoldSplitsTracker";
import {writeGoldenSplits} from "./read-golden-splits";
import {mapAndModeChanged} from "../types/global";
import {SettingsManager} from "./settings-manager";

export function registerLogEventHandlers(fileWatcher: FileWatcher, stateTracker: CurrentStateTracker, nameMappings: PogoNameMappings,
                                         pbSplitTracker: PbSplitTracker, goldenSplitsTracker: GoldSplitsTracker, overlayWindow: BrowserWindow,
                                         settingsManager: SettingsManager) {
    // map or mode gets logged
    fileWatcher.registerListener(
        /update splits at frame \d+: level_current\((?<map>\d+)\)m\((?<mode>\d+)\) run\((?<run>-?\d+)\)/,
        (match) => {
            const { map, mode, run } = match.groups!;
            const mapNum = parseInt(map);
            const modeNum = parseInt(mode);
            const changed = stateTracker.updateMapAndMode(mapNum, modeNum);
            if (changed) {
                onMapOrModeChanged(mapNum, modeNum, nameMappings, pbSplitTracker, goldenSplitsTracker, overlayWindow, settingsManager);
            }
        }
    );

    // split gets logged
    fileWatcher.registerListener(
        /playerCheckpointDo\(\) at frame \d+: new checkpoint\((?<checkpoint>\d+)\), old\((?<old>-?\d+)\) runTimeCurrent\((?<time>\d+\.\d+)\), cpTime\((?<overwrittenTime>\d+\.\d+)\)/,
        (match) => {
            const { checkpoint, old, time, overwrittenTime } = match.groups!;
            const split = parseInt(checkpoint);
            const timeAsFloat  = parseFloat(time);
            const pbTime = pbSplitTracker.getPbTimeForSplit(stateTracker.getCurrentMode(), split);
            const diff = timeAsFloat - pbTime;
            let wasGolden = false;
            const shouldSkip = settingsManager.splitShouldBeSkipped(stateTracker.getCurrentMode(), split)
            if(!shouldSkip)
                wasGolden = stateTracker.passedSplit(split, timeAsFloat, stateTracker.getLastSplitTime())
            overlayWindow.webContents.send('split-passed', { splitIndex: split, splitTime: timeAsFloat, splitDiff: diff, golden: wasGolden});
            if (wasGolden) {
                overlayWindow.webContents.send("golden-split-passed", goldenSplitsTracker.getSumOfBest(stateTracker.getCurrentMode()));
            }
        }
    )

    // player reset gets logged
    fileWatcher.registerListener(
        /playerReset\(\) .*? playerLocalDead\((?<localDead>\d+)\) dontResetTime\((?<dontResetTime>\d+)\) map3IsAGo\((?<map3IsAGo>\d+)\)/,
        (match) => {
            stateTracker.resetRun();
            console.log(`Player reset: localDead=${match.groups!.localDead}, dontResetTime=${match.groups!.dontResetTime}, map3IsAGo=${match.groups!.map3IsAGo}`);
            if (stateTracker.getCurrentMode() >= 0 && stateTracker.getCurrentMap() >= 0)
                onMapOrModeChanged(stateTracker.getCurrentMap(), stateTracker.getCurrentMode(), nameMappings, pbSplitTracker, goldenSplitsTracker, overlayWindow, settingsManager);
            if (goldenSplitsTracker.hasChanged())
                writeGoldenSplits(goldenSplitsTracker.getGoldenSplits())
        }
    )

    // player run finish gets logged
    fileWatcher.registerListener(
        /playerRunFinish at frame \d+: requestProgressUploadTime\((?<time>\d+)\) <\? bestTime\((?<bestTime>\d+)\) replayRecordActive\((?<replayRecordActive>\d+)\) numFinishes\((?<numFinishes>\d+)\) skipless\((?<skipless>\d+)\) isConnectedToSteamServers\((?<isConnectedToSteamServers>\d+)\)/,
        (match) => {
            const { time, bestTime, replayRecordActive, numFinishes, skipless, isConnectedToSteamServers } = match.groups!;
            stateTracker.finishedRun(parseFloat(time), skipless === "1")
            if (goldenSplitsTracker.hasChanged())
                writeGoldenSplits(goldenSplitsTracker.getGoldenSplits())
        }
    )
    // when going into the menu or closing the window save the golden splits, to reduce lag during play
    fileWatcher.registerListener(
        /OPEN menu at frame \d+|Close window at \d+(?:\.\d+)?/,
        () => {
            if (goldenSplitsTracker.hasChanged())
                writeGoldenSplits(goldenSplitsTracker.getGoldenSplits())
        }
    );

    fileWatcher.registerListener(
        /levelLoadMenu - START at frame/,
        (match) => {
            overlayWindow.webContents.send("main-menu-opened")
        }
    );
}

export function onMapOrModeChanged(mapNum: number, modeNum: number, nameMappings: PogoNameMappings, pbSplitTracker: PbSplitTracker,
                            goldenSplitTracker: GoldSplitsTracker, overlayWindow: BrowserWindow, settingsManager: SettingsManager) {
    if (mapNum < 0 || modeNum < 0) {
        return;
    }
    const mapModeAndSplits: { map: string; mode: string; splits: string[] } = nameMappings.getMapModeAndSplits(mapNum, modeNum);
    const pbSplitTimes: { split: number; time: number }[] = pbSplitTracker.getPbSplitsForMode(modeNum);

    const pbTime = goldenSplitTracker.getPbForMode(modeNum);
    const sumOfBest = goldenSplitTracker.getSumOfBest(modeNum);
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
