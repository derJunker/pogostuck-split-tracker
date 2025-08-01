import {UserDataReader} from "./user-data-reader";
import {ModeSplits} from "../../types/mode-splits";
import {BrowserWindow} from "electron";

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
        const modeSplits = this.modeTimes.find(m => m.mode === mode);
        if (!modeSplits) {
            return 0;
        }
        return modeSplits.times.length;
    }

    public getPbSplitsForMode(mode: number): { split: number, time: number }[] {
        const modeSplits = this.modeTimes.find(m => m.mode === mode);
        if (!modeSplits) {
            console.warn(`No splits found for mode ${mode}`);
            return [];
        }
        return modeSplits.times;
    }

    public getPbTimeForSplit(mode: number, split: number) {
        const modeSplits = this.modeTimes.find(m => m.mode === mode);
        if (!modeSplits) {
            console.warn(`No splits found for mode ${mode}`);
            return -1;
        }
        const splitTime = modeSplits.times.find(s => s.split === split);
        if (!splitTime) {
            return -1;
        }
        return splitTime.time;
    }

    public getAllPbSplits(): ModeSplits[] {
        return this.modeTimes;
    }

    public setSplitsForMode(mode: number, recordedSplits: { split: number; time: number }[]) {
        const modeSplits = this.modeTimes.find(m => m.mode === mode);
        if (!modeSplits) {
            console.warn(`No splits found for mode ${mode}, creating new entry.`);
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
        this.modeTimes = userDataReader.readPbSplitsFromFile(configWindow, overlayWindow);
    }
}