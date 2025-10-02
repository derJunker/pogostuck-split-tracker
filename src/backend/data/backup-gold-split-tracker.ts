import log from "electron-log/main";
import fs from "fs";
import path from "path";
import {app, BrowserWindow, ipcMain} from "electron";
import { PogoNameMappings } from "./pogo-name-mappings";
import {GoldSplitHistory} from "../../types/gold-split-history";
import {Split} from "../../types/mode-splits";
import {GoldSplitsTracker} from "./gold-splits-tracker";
import {writeGoldSplitsIfChanged} from "../file-reading/read-golden-splits";
import {CurrentStateTracker} from "./current-state-tracker";
import {redrawSplitDisplay} from "../split-overlay-window";
import {PbSplitTracker} from "./pb-split-tracker";
import {isUpsideDownMode} from "./valid-modes";

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

    public initListeners(configWindow: BrowserWindow, overlayWindow: BrowserWindow) {
        ipcMain.handle("revert-gold-split", (_event, from: number, to: number, mode:number) => {
            const restored = this.restoreBackup({from, to}, mode)
            if (restored !== null) {
                log.info(`Restored backup gold split for mode ${mode}, split from ${from} to ${to}: ${restored}`);
                const goldSplitTracker = GoldSplitsTracker.getInstance();
                goldSplitTracker.updateGoldSplit(mode, from, to, restored)
                writeGoldSplitsIfChanged(configWindow)
                this.saveBackupsIfChanged()
                this.redrawSplitsIfCurrentMode(mode, overlayWindow)
                return restored
            }
            return -1
        })

        ipcMain.handle("get-valid-rollbacks", (_event, mode: number) => {
            const modeHistory = this.getHistoryForMode(mode)
            log.debug(`Getting valid rollbacks for mode ${mode}, history: ${JSON.stringify(modeHistory)}`);
            if (!modeHistory)
                return [];
            return modeHistory.splitHistories.map(sh => {
                let history = sh.history.filter(num => num !== null)
                return {
                    from: sh.split.from,
                    to: sh.split.to,
                    valid: history.length > 0, // for some reason sometimes null is put
                    // in there, but i cant reproduce it, so just filter it out. Just a quick fix of the issue not a
                    // solution, sorry T_T
                    oldTime: history.length > 0 ? sh.history[sh.history.length -1] : undefined
                }
            })
        })
    }

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
        let splitBackups = this.getHistoryForSplit(mode, split)
        log.info(`adding backup for mode ${mode}, split ${JSON.stringify(split)}: ${time}, existing: ${JSON.stringify(splitBackups)}`);
        splitBackups.push(time)
        this.backupsChanged = true;
    }

    public restoreBackup(split: Split, mode: number) {
        const splitBackups = this.getHistoryForSplit(mode, split)
        if (!splitBackups || splitBackups.length == 0)
            return null;
        this.backupsChanged = true;
        return splitBackups.splice(-1, 1)[0]
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
        let modeHistory = this.getHistoryForMode(mode)
        if (!modeHistory) {
            log.warn(`Getting Backup but mode: ${mode} not found! (No worries, if it's a new custom mode)`);
            const newHistory: GoldSplitHistory = {
                mode: mode,
                splitHistories: []
            }
            this.backups.push(newHistory)
            modeHistory = newHistory;
            this.backupsChanged = true;
        }
        return this.getHistoryForSplitWithHistory(modeHistory, split)
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

    private redrawSplitsIfCurrentMode(mode: number, overlayWindow: BrowserWindow) {
        const stateTracker = CurrentStateTracker.getInstance()
        const curMode = stateTracker.getCurrentMode()
        if (curMode === mode) {
            log.info(`Redrawing splits on overlay, because current mode ${curMode} matches modified mode ${mode}`);
            const map = stateTracker.getCurrentMap()
            redrawSplitDisplay(map, mode, overlayWindow)
        }
    }

    public deleteMode(modeIndex: number) {
        const modeIndexExists = this.backups.some(b => b.mode === modeIndex)
        this.backups = this.backups.filter(b => b.mode !== modeIndex)
        this.backupsChanged = modeIndexExists;
        this.saveBackupsIfChanged()
    }
}