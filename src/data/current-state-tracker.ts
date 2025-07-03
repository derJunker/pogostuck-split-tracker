import {GoldSplitsTracker} from "./GoldSplitsTracker";

export class CurrentStateTracker {
    private mode: number = -1;
    private map: number = -1;
    private recordedSplits: { split: number, time: number }[] = [];
    private finalTime: number = -1;

    private pb: number = 0;

    private goldSplitsTracker: GoldSplitsTracker;

    constructor(goldenSplitsTracker: GoldSplitsTracker) {
        this.goldSplitsTracker = goldenSplitsTracker;
    }

    public updateMapAndMode(map: number, mode: number): boolean {
        if (this.map !== map || this.mode !== mode) {
            this.map = map;
            this.mode = mode;
            this.recordedSplits = [];
            this.finalTime = -1;
            this.pb = this.goldSplitsTracker.getPbForMode(this.mode);
            console.log(`Map changed to ${map}, mode changed to ${mode}`);
            return true;
        }
        return false;
    }

    public passedSplit(split: number, time: number, lastSplit: {split:number, time:number}): boolean {
        while (this.recordedSplits.length < lastSplit.split) {
            console.log(`Adding missing split ${this.recordedSplits.length} with time 0`);
            this.recordedSplits.push({ split: this.recordedSplits.length, time: 0 });
        }
        const splitTime = time - (lastSplit ? lastSplit.time : 0);
        this.recordedSplits.push({ split, time: time });
        let goldSplit = this.goldSplitsTracker.getGoldSplitForModeAndSplit(this.mode, split)
        if (!goldSplit || goldSplit > splitTime) {
            this.goldSplitsTracker.updateGoldSplit(this.mode, split, splitTime)
            console.log(`New best split for ${split}: ${time}`)
            return true;
        } else {
            console.log(`Split passed: ${split} at time ${time}`);
            return false;
        }
    }

    public finishedRun(time: number, skipless: boolean): void {
        this.finalTime = time;
        console.log(`Run finished with time: ${time}, skipless: ${skipless}`);
        if (this.finalTime > this.pb) {
            console.log(`New personal best: ${this.finalTime}`);
            this.pb = this.finalTime;
            // TODO write this to a file && update the UI
        }
    }

    public resetRun() {
        // TODO save the recorded splits for data
        this.recordedSplits = [];
        this.finalTime = -1;
    }

    public getCurrentMap(): number {
        return this.map;
    }
    public getCurrentMode(): number {
        return this.mode;
    }

    public getLastSplitTime() {
        if (this.recordedSplits.length === 0) {
            return {
                split: -1,
                time: 0
            }
        }
        return this.recordedSplits[this.recordedSplits.length - 1];
    }
}