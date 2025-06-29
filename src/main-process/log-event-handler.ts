import { FileWatcher } from './logs-watcher';
import {CurrentStateTracker} from "../data/current-state-tracker";
import {BrowserWindow, ipcMain} from "electron";

export function registerLogEventHandlers(fileWatcher: FileWatcher, stateTracker: CurrentStateTracker, overlayWindow: BrowserWindow) {
    fileWatcher.registerListener(
        /update splits at frame \d+: level_current\((?<map>\d+)\)m\((?<mode>\d+)\) run\((?<run>-?\d+)\)/,
        (match) => {
            const { map, mode, run } = match.groups!;
            const mapNum = parseInt(map);
            const modeNum = parseInt(mode);
            const changed = stateTracker.updateMapAndMode(mapNum, modeNum);
            if (changed) {
                overlayWindow.webContents.send('map-or-mode-changed', { map: mapNum.toString(), mode: modeNum.toString() });
            }
        }
    );
    fileWatcher.registerListener(
        /playerCheckpointDo\(\) at frame \d+: new checkpoint\((?<checkpoint>\d+)\), old\((?<old>-?\d+)\) runTimeCurrent\((?<time>\d+\.\d+)\), cpTime\((?<overwrittenTime>\d+\.\d+)\)/,
        (match) => {
            const { checkpoint, old, time, overwrittenTime } = match.groups!;
            const split = parseInt(checkpoint);
            const timeAsFloat  = parseFloat(time);
            stateTracker.passedSplit(split, timeAsFloat)
            overlayWindow.webContents.send('split-passed', { splitIndex: split, splitTime: timeAsFloat, splitDiff: -1});
        }
    )
    fileWatcher.registerListener(
        /playerReset\(\) .*? playerLocalDead\((?<localDead>\d+)\) dontResetTime\((?<dontResetTime>\d+)\) map3IsAGo\((?<map3IsAGo>\d+)\)/,
        (match) => {
            stateTracker.resetRun();
            overlayWindow.webContents.send('map-or-mode-changed', { map: stateTracker.getCurrentMap().toString(), mode: stateTracker.getCurrentMode().toString() });
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
