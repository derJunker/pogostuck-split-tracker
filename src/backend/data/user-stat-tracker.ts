import {UserModeStats} from "../../types/user-stats-types";
import {readUserStats} from "../file-reading/read-user-stats";


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

        this.changed = true;
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