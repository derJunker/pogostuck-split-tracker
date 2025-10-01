import {UserDataReader} from "./user-data-reader";
import {ModeSplits} from "../../types/mode-splits";
import {BrowserWindow} from "electron";
import log from "electron-log/main";
import {CustomModeHandler} from "./custom-mode-handler";
import {PogoNameMappings} from "./pogo-name-mappings";

export class PbSplitTracker {
    private static instance: PbSplitTracker | null = null;
    private modeTimes: ModeSplits[] = [];

    private constructor() {}

    public static getInstance(): PbSplitTracker {
        if (!PbSplitTracker.instance) {
            PbSplitTracker.instance = new PbSplitTracker();
        }
        return PbSplitTracker.instance;
    }

    public getSplitAmountForMode(mode: number): number {
        const mappings = PogoNameMappings.getInstance();
        const map = mappings.getAllLevels().find(m => m.modes.some(md => md.key === mode));
        if (!map) {
            log.warn(`No map found for mode ${mode}, when getting split amount`);
            return 0;
        }
        return map.splits.length
    }

    public getPbSplitsForMode(mode: number): ModeSplits | null {
        const modeSplits = this.modeTimes.find(m => m.mode === mode);
        if (!modeSplits) {
            log.warn(`No splits found, when getting splits for mode ${mode}`);
            return null;
        }
        return modeSplits;
    }

    public getPbTimeForSplit(mode: number, split: number) {
        const modeSplits = this.modeTimes.find(m => m.mode === mode);
        if (!modeSplits) {
            log.warn(`No splits found, when getting pb time for split ${split} in mode ${mode}`);
            return -1;
        }
        const splitTime = modeSplits.times.find(s => s.split === split);
        if (!splitTime) {
            const newTime = { split, time: Infinity }
            modeSplits.times.push(newTime);
            return Infinity;
        }
        return splitTime.time;
    }

    public getAllPbSplits(): ModeSplits[] {
        return this.modeTimes;
    }

    public setSplitsForMode(mode: number, recordedSplits: { split: number; time: number }[]) {
        const modeSplits = this.modeTimes.find(m => m.mode === mode);
        if (!modeSplits) {
            log.warn(`No splits found for mode ${mode}, creating new entry.`);
            this.modeTimes.push({ mode, times: recordedSplits });
        } else {
            // keeping old ones but adding and overriding with new ones
            const splitMap = new Map<number, number>();
            modeSplits.times.forEach(s => splitMap.set(s.split, s.time));
            recordedSplits.forEach(s => splitMap.set(s.split, s.time));
            modeSplits.times = Array.from(splitMap.entries())
                .map(([split, time]) => ({ split, time }))
                .sort((a, b) => a.split - b.split);
        }
    }

    public updatePbSplitsFromFile(configWindow: BrowserWindow, overlayWindow: BrowserWindow) {
        const userDataReader = UserDataReader.getInstance()
        const customModeHandler = CustomModeHandler.getInstance();
        const regularModeTimes = userDataReader.readPbSplitsFromFile(configWindow, overlayWindow);
        const customModeTimes: ModeSplits[] = customModeHandler.getCustomModeInfos().map(cm => ({
            mode: cm.modeIndex,
            times: cm.modeTimes.map((time, index) => ({ split: index, time }))
        }));
        this.modeTimes = [...regularModeTimes, ...customModeTimes];
    }
}