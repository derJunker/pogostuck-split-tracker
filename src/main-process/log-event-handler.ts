import { FileWatcher } from './logs-watcher';

export function registerLogEventHandlers(fileWatcher: FileWatcher) {
    fileWatcher.registerListener(
        /update splits at frame \\d+: level_current\\((?<map>\\d+)\\)m\\((?<mode>\\d+)\\) run\\((?<run>-?\\d+)\\)/,
        (match) => {
            if (match && match.groups) {
                const { map, mode, run } = match.groups;
                console.log(`Gamemode assurance: map=${map}, mode=${mode}, run=${run}`);
            }
        }
    );
    fileWatcher.registerListener(
        /playerCheckpointDo\\(\\) at frame \\d+: new checkpoint\\((?<checkpoint>\\d+)\\), old\\((?<old>-?\\d+)\\) runTimeCurrent\\((?<time>\\d+\\.\\d+)\\), cpTime\\((?<overwrittenTime>\\d+\\.\\d+)\\)/,
        (match) => {
            if (match && match.groups) {
                const { checkpoint, old, time, overwrittenTime } = match.groups;
                console.log(`Player split: checkpoint=${checkpoint}, old=${old}, time=${time}, overwrittenTime=${overwrittenTime}`);
            }
        }
    )
    fileWatcher.registerListener(
        /playerReset\\(\\) .*? playerLocalDead\\((?<localDead>\\d+)\\) dontResetTime\\((?<dontResetTime>\\d+)\\) map3IsAGo\\((?<map3IsAGo>\\d+)\\)/,
        (match) => {
            if (match && match.groups) {
                const { localDead, dontResetTime, map3IsAGo } = match.groups;
                console.log(`Player reset: localDead=${localDead}, dontResetTime=${dontResetTime}, map3IsAGo=${map3IsAGo}`);
            }
        }
    )
    fileWatcher.registerListener(
        /playerRunFinish at frame \\d+: requestProgressUploadTime\\((?<pbTime>\\d+)\\) <\\? bestTime\\((?<bestTime>\\d+)\\) replayRecordActive\\((?<replayRecordActive>\\d+)\\) numFinishes\\((?<numFinishes>\\d+)\\) skipless\\((?<skipless>\\d+)\\) isConnectedToSteamServers\\((?<isConnectedToSteamServers>\\d+)\\)/,
        (match) => {
            if (match && match.groups) {
                const { pbTime, bestTime, replayRecordActive, numFinishes, skipless, isConnectedToSteamServers } = match.groups;
                console.log(`Player run finish: pbTime=${pbTime}, bestTime=${bestTime}, replayRecordActive=${replayRecordActive}, numFinishes=${numFinishes}, skipless=${skipless}, isConnectedToSteamServers=${isConnectedToSteamServers}`);
            }
        }
    )
}
