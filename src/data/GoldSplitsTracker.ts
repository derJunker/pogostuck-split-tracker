import {GoldenSplitsForMode} from "../types/golden-splits";

export class GoldSplitsTracker {
    private changed: boolean = false;
    private goldenSplits: GoldenSplitsForMode[];

    constructor(goldenSplits: GoldenSplitsForMode[]) {
        this.goldenSplits = goldenSplits;
    }

    public getGoldSplitForModeAndSplit(modeIndex: number, splitIndex: number): number | null {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex);
        if (modeSplits) {
            const splitTime = modeSplits.goldenSplits[splitIndex];
            return splitTime !== undefined ? splitTime : null;
        }
        return null;
    }

    public getPbForMode(modeIndex: number): number {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex);
        return modeSplits ? modeSplits.pb : 0;
    }

    public getSumOfBest(modeNum: number) {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeNum);
        if (modeSplits) {
            return modeSplits.goldenSplits.reduce((sum, time) => sum + time, 0);
        }
        return -1;
    }

    public updateGoldSplit(modeIndex: number, splitIndex: number, newTime: number): void {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex)!;
        this.changed = true;
        modeSplits.goldenSplits[splitIndex] = newTime;
        console.log(`Updated gold split for mode ${modeIndex}, split ${splitIndex} to ${newTime}`);
    }

    public hasChanged(): boolean {
        return this.changed;
    }

    public getGoldenSplits() {
        return this.goldenSplits;
    }
}