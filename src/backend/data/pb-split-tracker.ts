import {UserDataReader} from "./user-data-reader";

export class PbSplitTracker {
    private modeTimes: ModeSplits[] = [];


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

    updatePbSplitsFromFile() {
        const userDataReader = UserDataReader.getInstance()
        this.modeTimes = userDataReader.readPbSplitsFromFile();
    }
}