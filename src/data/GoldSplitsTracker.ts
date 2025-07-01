import {GoldenSplitsForMode} from "../types/golden-splits";

export class GoldSplitsTracker {
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
}