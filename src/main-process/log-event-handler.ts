import { FileWatcher } from './logs-watcher';


const playerState: { map: number, mode: number, recordedSplits: {split: number, time: number}[] } = {
    map: -1,
    mode: -1,
    recordedSplits: [],
}

export function registerLogEventHandlers(fileWatcher: FileWatcher, mainWindow: Electron.BrowserWindow) {
    fileWatcher.registerListener(
        /update splits at frame \d+: level_current\((?<map>\d+)\)m\((?<mode>\d+)\) run\((?<run>-?\d+)\)/,
        (match) => {
            const { map, mode, run } = match.groups!;
            const mapNum = parseInt(map);
            const modeNum = parseInt(mode);
            if (playerState.map !== mapNum || playerState.mode !== modeNum) {
                playerState.map = mapNum;
                playerState.mode = modeNum;
                mainWindow.webContents.send('map-or-mode-changed', { map: mapNum  + "", mode: modeNum + ""});
                console.log(`Player state updated: map=${playerState.map}, mode=${playerState.mode},`);
            }
        }
    );
    fileWatcher.registerListener(
        /playerCheckpointDo\(\) at frame \d+: new checkpoint\((?<checkpoint>\d+)\), old\((?<old>-?\d+)\) runTimeCurrent\((?<time>\d+\.\d+)\), cpTime\((?<overwrittenTime>\d+\.\d+)\)/,
        (match) => {
            const { checkpoint, old, time, overwrittenTime } = match.groups!;
            // TODO check if pb split etc.
            const split = parseInt(checkpoint);
            const timeMs = Math.round(parseFloat(time) * 1000);
            playerState.recordedSplits.push({ split, time: timeMs });
            mainWindow.webContents.send("split-passed", { splitName: `Split ${split}`, splitTime: timeMs });
            console.log(`Checkpoint recorded: split=${split}, time=${timeMs}, overwrittenTime=${overwrittenTime}`);
        }
    )
    fileWatcher.registerListener(
        /playerReset\(\) .*? playerLocalDead\((?<localDead>\d+)\) dontResetTime\((?<dontResetTime>\d+)\) map3IsAGo\((?<map3IsAGo>\d+)\)/,
        (match) => {
            const { localDead, dontResetTime, map3IsAGo } = match.groups!;
            playerState.recordedSplits = [];
            console.log(`Player reset: localDead=${localDead}, dontResetTime=${dontResetTime}, map3IsAGo=${map3IsAGo}`);
        }
    )
    fileWatcher.registerListener(
        /playerRunFinish at frame \d+: requestProgressUploadTime\((?<pbTime>\d+)\) <\? bestTime\((?<bestTime>\d+)\) replayRecordActive\((?<replayRecordActive>\d+)\) numFinishes\((?<numFinishes>\d+)\) skipless\((?<skipless>\d+)\) isConnectedToSteamServers\((?<isConnectedToSteamServers>\d+)\)/,
        (match) => {
            const { pbTime, bestTime, replayRecordActive, numFinishes, skipless, isConnectedToSteamServers } = match.groups!;
            console.log(`Player run finish: pbTime=${pbTime}, bestTime=${bestTime}, replayRecordActive=${replayRecordActive}, numFinishes=${numFinishes}, skipless=${skipless}, isConnectedToSteamServers=${isConnectedToSteamServers}`);
        }
    )
}
