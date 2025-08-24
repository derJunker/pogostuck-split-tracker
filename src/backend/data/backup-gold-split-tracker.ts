import {GoldenSplitsForMode} from "../../types/golden-splits";
import log from "electron-log/main";

export class BackupGoldSplitTracker {
    private static instance: BackupGoldSplitTracker;

    public static getInstance(): BackupGoldSplitTracker {
        if (!BackupGoldSplitTracker.instance) {
            BackupGoldSplitTracker.instance = new BackupGoldSplitTracker();
        }
        return BackupGoldSplitTracker.instance;
    }

    private backups: Map<number, Map<{from: number, to: number}, number[]>> = new Map()

    public initBackupMap() {
        log.error("TODO: init backup map")
    }

    public addBackup(time:number, split: {from: number, to: number}, mode: number): void {
        const splitBackups = this.getSplitBackups(split, mode);
        if (!splitBackups)
            return;
        if (splitBackups.length >= 3) {
            splitBackups.splice(0, 1)
        }
        splitBackups.push(time)
    }

    public restoreBackup(split: {from: number, to: number}, mode: number) {
        const splitBackups = this.getSplitBackups(split, mode);
        if (!splitBackups || splitBackups.length == 0)
            return null;
        return splitBackups.splice(-1, 1)
    }

    public saveBackups() {
        log.error("TODO impl saveBackups")
    }

    private getSplitBackups(split: {from: number, to: number}, mode: number) {
        const modeBackups = this.backups.get(mode)
        if (!modeBackups) {
            log.error(`Adding Backup but mode: ${mode} not found!`);
            return null;
        }
        const splitBackups = modeBackups.get(split);
        if (!splitBackups) {
            log.error(`Adding Backup but split: ${split} not found! For mode ${mode}`);
            return null;
        }
        return splitBackups;
    }
}