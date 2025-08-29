import log from "electron-log/main";
import fs from "fs";
import path from "path";
import {app} from "electron";
import { PogoNameMappings } from "./pogo-name-mappings";
import {GoldSplitHistory} from "../../types/gold-split-history";
import {Split} from "../../types/mode-splits";

const backupGoldsPath = path.join(app.getPath("userData"), "gold-split-backups.json");

export class BackupGoldSplitTracker {
    private static instance: BackupGoldSplitTracker;

    private backupsChanged: boolean = false;

    public static getInstance(): BackupGoldSplitTracker {
        if (!BackupGoldSplitTracker.instance) {
            BackupGoldSplitTracker.instance = new BackupGoldSplitTracker();
        }
        return BackupGoldSplitTracker.instance;
    }

    private backups: GoldSplitHistory[] = []

    public loadBackups() {
        const indexToNamesMappings = PogoNameMappings.getInstance()
        if (fs.existsSync(backupGoldsPath)) {
            log.info(`Loading Backup Gold Splits from ${backupGoldsPath}`);
            try {
                const data = require(backupGoldsPath);
                if (Array.isArray(data)) {
                    this.backups = data.map((item: any) => ({
                        ...item
                    }));
                    log.info(`Loaded Backup Gold Splits from file: ${backupGoldsPath}`);
                } else {
                    log.error("Expected an array for Backup Gold Splits but got:", typeof data);
                }
            } catch (error) {
                log.error("Error reading backup gold splits:", error);
            }
        }
        else {
            indexToNamesMappings.getAllLevels().forEach(level => {
                for (const mode of level.modes) {
                    this.backups.push({
                        mode: mode.key,
                        splitHistories: []
                    })
                }
            })
            log.info(`No backup gold splits file found at ${backupGoldsPath}, creating default structure.`);
        }
    }

    public addBackup(time:number, split: Split, mode: number): void {
        const splitBackups = this.getHistoryForSplit(mode, split)
        log.info(`adding backup for mode ${mode}, split ${JSON.stringify(split)}: ${time}, existing: ${JSON.stringify(splitBackups)}`);
        if (!splitBackups)
            return;
        if (splitBackups.length >= 5) {
            splitBackups.splice(0, 1)
        }
        splitBackups.push(time)
        log.info(`splitBackups: ${JSON.stringify(splitBackups)}, this.backups: ${JSON.stringify(this.backups)}`);
        this.backupsChanged = true;
    }

    public restoreBackup(split: Split, mode: number) {
        const splitBackups = this.getHistoryForSplit(mode, split)
        if (!splitBackups || splitBackups.length == 0)
            return null;
        this.backupsChanged = true;
        return splitBackups.splice(-1, 1)
    }

    public saveBackupsIfChanged() {
        if (!this.backupsChanged)
            return;
        fs.writeFileSync(backupGoldsPath, JSON.stringify(this.backups, null, 2));
        this.backupsChanged = false;
    }

    private getHistoryForMode(mode: number) {
        return this.backups.find(splitHistory => splitHistory.mode === mode)
    }

    private getHistoryForSplit(mode: number, split: Split) {
        const splitHistory = this.getHistoryForMode(mode)
        if (!splitHistory) {
            log.error(`Getting Backup but mode: ${mode} not found!`);
            return undefined;
        }
        return this.getHistoryForSplitWithHistory(splitHistory, split)
    }

    private getHistoryForSplitWithHistory(splitHistory: GoldSplitHistory, split: Split) {
        let history = splitHistory.splitHistories.find(sh => sh.split.to === split.to && sh.split.from === split.from)?.history
        if (!history) {
            history = [];
            splitHistory.splitHistories.push({
                split,
                history: history
            })
        }
        return history

    }
}