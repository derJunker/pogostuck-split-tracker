import { FileWatcher } from './logs-watcher';
import { getLevelNameByKey, getCheckpointNameByKey, getModeNameByKey } from "../types/pogo-index-mapping";

const playerState: { map: string, mode: string, passedSplit: string } = {
    map: '',
    mode: '',
    passedSplit: '',
}

export function registerLogEventHandlers(fileWatcher: FileWatcher) {
    fileWatcher.registerListener(
        /update splits at frame \d+: level_current\((?<map>\d+)\)m\((?<mode>\d+)\) run\((?<run>-?\d+)\)/,
        (match) => {
            const { map, mode, run } = match.groups!;
            if (playerState.map !== map || playerState.mode !== mode) {
                playerState.map = getLevelNameByKey(parseInt(map)) || map;
                playerState.mode = getModeNameByKey(parseInt(map), parseInt(mode)) || mode;
                console.log(`Player state updated: map=${playerState.map}, mode=${playerState.mode}, passedSplit=${playerState.passedSplit}`);
            }
        }
    );
    fileWatcher.registerListener(
        /playerCheckpointDo\(\) at frame \d+: new checkpoint\((?<checkpoint>\d+)\), old\((?<old>-?\d+)\) runTimeCurrent\((?<time>\d+\.\d+)\), cpTime\((?<overwrittenTime>\d+\.\d+)\)/,
        (match) => {
            const { checkpoint, old, time, overwrittenTime } = match.groups!;
            // TODO check if pb split etc.
            console.log(`Player checkpoint updated: checkpoint=${checkpoint}, old=${old}, time=${time}, overwrittenTime=${overwrittenTime}, passedSplit=${playerState.passedSplit}`);
        }
    )
    fileWatcher.registerListener(
        /playerReset\(\) .*? playerLocalDead\((?<localDead>\d+)\) dontResetTime\((?<dontResetTime>\d+)\) map3IsAGo\((?<map3IsAGo>\d+)\)/,
        (match) => {
            const { localDead, dontResetTime, map3IsAGo } = match.groups!;
            playerState.passedSplit = '';
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
