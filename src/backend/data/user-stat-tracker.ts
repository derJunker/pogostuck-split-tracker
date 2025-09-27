import {UserModeStats} from "../../types/user-stats-types";
import {readUserStats, writeUserStats, writeUserStatsIfChanged} from "../file-reading/read-user-stats";
import log from "electron-log/main";
import {SettingsManager} from "../settings-manager";
import {isUpsideDownMode} from "./valid-modes";


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

    public increaseResetsAfterSplit(map: number, mode: number, split: number) {
        log.info(`increasing resets for map ${map}, mode ${mode},after split ${split}`);
        let modeStats = this.userStats.find(ums => ums.map === map && ums.mode === mode);
        if (!modeStats) {
            modeStats = {
                map,
                mode,
                resetsAfterSplit: [{split, resets: 0}]
            };
            this.userStats.push(modeStats);
        }
        const settingsManager = SettingsManager.getInstance();
        const splitIndexPath = settingsManager.getSplitIndexPath(mode);
        const isUD = isUpsideDownMode(mode);
        const matches = (seg: { from: number; to: number }) => {
            if (!isUD) return seg.to > split;
            return seg.to <= split;
        }
        const remainingSegments = splitIndexPath.filter(matches);
        const splitSegmentTo = remainingSegments.length
            ? (isUD
                ? Math.max(...remainingSegments.map(seg => seg.to))
                : Math.min(...remainingSegments.map(seg => seg.to)))
            : undefined;
        log.debug(`Found segment: ${JSON.stringify(splitSegmentTo)}`);
        if (splitSegmentTo == null) {
            throw new Error(`Could not find segment for split ${split} in mode ${mode}`);
        }
        let splitStat = modeStats.resetsAfterSplit.find(s => s.split === splitSegmentTo);
        if (!splitStat) {
            splitStat = {split: splitSegmentTo, resets: 0};
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

    public deleteMode(modeIndex: number) {
        const modeIndexExists = this.userStats.some(b => b.mode === modeIndex)
        this.userStats = this.userStats.filter(b => b.mode !== modeIndex)
        this.changed = modeIndexExists;
        writeUserStatsIfChanged()
    }
}