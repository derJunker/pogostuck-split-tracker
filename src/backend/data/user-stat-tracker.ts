import {UserModeStats} from "../../types/user-stats-types";
import {readUserStats, writeUserStats, writeUserStatsIfChanged} from "../file-reading/read-user-stats";
import log from "electron-log/main";


export class UserStatTracker {
    private static instance: UserStatTracker | null = null;

    public static getInstance(): UserStatTracker {
        if (this.instance === null) {
            this.instance = new UserStatTracker();
        }
        return this.instance;
    }

    private userStats: UserModeStats[] = [];
    private changed: boolean = false;

    private constructor() {
        this.userStats = readUserStats();
    }

    public increaseResetsForSplit(map: number, mode: number, split: number) {
        log.info(`increasing resets for map ${map}, mode ${mode}, split ${split}`);
        let modeStats = this.userStats.find(ums => ums.map === map && ums.mode === mode);
        if (!modeStats) {
            modeStats = {
                map,
                mode,
                resetsAfterSplit: [{split, resets: 0}]
            };
            this.userStats.push(modeStats);
        }
        let splitStat = modeStats.resetsAfterSplit.find(s => s.split === split);
        if (!splitStat) {
            splitStat = {split, resets: 0};
            modeStats.resetsAfterSplit.push(splitStat);
        }
        splitStat.resets += 1;
        log.info(`modeStats after increase: ${JSON.stringify(modeStats)}`);

        this.changed = true;
    }

    public getUserStatsForMode(map: number, mode: number) {
        let userStatsForMode = this.userStats.find(ums => ums.mode === mode && ums.map === map);
        if (!userStatsForMode) {
            userStatsForMode = {
                map: map,
                mode: mode,
                resetsAfterSplit: []
            }
            this.userStats.push(userStatsForMode);
            writeUserStats()
        }
        return userStatsForMode;
    }


    public changeSaved() {
        this.changed = false;
    }

    public hasChanged() {
        return this.changed;
    }

    public getUserStats() {
        return this.userStats;
    }
}