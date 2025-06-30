import { FileWatcher } from './logs-watcher';
import {CurrentStateTracker} from "../data/current-state-tracker";
import {BrowserWindow, ipcMain} from "electron";
import {PogoLevel} from "../types/pogo-index-mapping";
import {PogoNameMappings} from "../data/pogo-name-mappings";
import {PbSplitTracker} from "../data/pb-split-tracker";

export function registerLogEventHandlers(fileWatcher: FileWatcher, stateTracker: CurrentStateTracker, nameMappings: PogoNameMappings, pbSplitTracker: PbSplitTracker, overlayWindow: BrowserWindow) {
    fileWatcher.registerListener(
        /update splits at frame \d+: level_current\((?<map>\d+)\)m\((?<mode>\d+)\) run\((?<run>-?\d+)\)/,
        (match) => {
            const { map, mode, run } = match.groups!;
            const mapNum = parseInt(map);
            const modeNum = parseInt(mode);
            const changed = stateTracker.updateMapAndMode(mapNum, modeNum);
            if (changed) {
                onMapOrModeChanged(mapNum, modeNum, nameMappings, pbSplitTracker, overlayWindow);
            }
        }
    );
    fileWatcher.registerListener(
        /playerCheckpointDo\(\) at frame \d+: new checkpoint\((?<checkpoint>\d+)\), old\((?<old>-?\d+)\) runTimeCurrent\((?<time>\d+\.\d+)\), cpTime\((?<overwrittenTime>\d+\.\d+)\)/,
        (match) => {
            const { checkpoint, old, time, overwrittenTime } = match.groups!;
            const split = parseInt(checkpoint);
            const timeAsFloat  = parseFloat(time);
            const pbTime = pbSplitTracker.getPbTimeForSplit(stateTracker.getCurrentMode(), split);
            const diff = timeAsFloat - pbTime;
            stateTracker.passedSplit(split, timeAsFloat)
            overlayWindow.webContents.send('split-passed', { splitIndex: split, splitTime: timeAsFloat, splitDiff: diff});
        }
    )
    fileWatcher.registerListener(
        /playerReset\(\) .*? playerLocalDead\((?<localDead>\d+)\) dontResetTime\((?<dontResetTime>\d+)\) map3IsAGo\((?<map3IsAGo>\d+)\)/,
        (match) => {
            stateTracker.resetRun();
            onMapOrModeChanged(stateTracker.getCurrentMap(), stateTracker.getCurrentMode(), nameMappings, pbSplitTracker, overlayWindow);
        }
    )
    fileWatcher.registerListener(
        /playerRunFinish at frame \d+: requestProgressUploadTime\((?<time>\d+)\) <\? bestTime\((?<bestTime>\d+)\) replayRecordActive\((?<replayRecordActive>\d+)\) numFinishes\((?<numFinishes>\d+)\) skipless\((?<skipless>\d+)\) isConnectedToSteamServers\((?<isConnectedToSteamServers>\d+)\)/,
        (match) => {
            const { time, bestTime, replayRecordActive, numFinishes, skipless, isConnectedToSteamServers } = match.groups!;
            stateTracker.finishedRun(parseFloat(time), skipless === "1")
        }
    )
}

function onMapOrModeChanged(mapNum: number, modeNum: number, nameMappings: PogoNameMappings, pbSplitTracker: PbSplitTracker, overlayWindow: BrowserWindow) {
    const mapModeAndSplits: { map: string; mode: string; splits: string[] } = nameMappings.getMapModeAndSplits(mapNum, modeNum);
    const pbSplitTimes: { split: number; time: number }[] = pbSplitTracker.getPbSplitsForMode(modeNum);
    const mapModeAndSplitsWithTimes: { map: string; mode: string; splits: { name: string; split: number; time: number }[] } = {
        map: mapModeAndSplits.map,
        mode: mapModeAndSplits.mode,
        splits: mapModeAndSplits.splits.map((splitName, i) => ({
            name: splitName,
            split: pbSplitTimes[i]!.split,
            time: pbSplitTimes[i]!.time
        }))
    };
    overlayWindow.webContents.send('map-or-mode-changed', mapModeAndSplitsWithTimes);
}
