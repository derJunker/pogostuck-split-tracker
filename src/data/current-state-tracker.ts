export class CurrentStateTracker {
    private mode: number = -1;
    private map: number = -1;
    private recordedSplits: { split: number, time: number }[] = [];
    private finalTime: number = -1;

    private pb: number = 0;
    // splits of the current personal best run
    private pbSplits: { split: number, time: number }[] = [];

    // golden splits (all time best singular splits)
    private bestSplits: { split: number, time: number }[] = [];

    public updateMapAndMode(map: number, mode: number): void {
        if (this.map !== map || this.mode !== mode) {
            this.map = map;
            this.mode = mode;
            this.recordedSplits = [];
            this.finalTime = -1;
            // TODO update pb, pbSplits, and bestSplits
            console.log(`Map changed to ${map}, mode changed to ${mode}`);
        }
    }

    public passedSplit(split: number, time: number): void {
        this.recordedSplits.push({ split, time: time });
        if (this.bestSplits[split] === undefined || this.bestSplits[split].time > time) {
            this.pbSplits[split] = { split, time: time };
            console.log(`New best split for ${split}: ${time}`)
            // TODO write this to a file
        } else {
            console.log(`Split passed: ${split} at time ${time}`);
        }
    }

    public finishedRun(time: number, skipless: boolean): void {
        this.finalTime = time;
        console.log(`Run finished with time: ${time}, skipless: ${skipless}`);
        if (this.finalTime > this.pb) {
            console.log(`New personal best: ${this.finalTime}`);
            this.pb = this.finalTime;
            this.pbSplits = [...this.recordedSplits];
            // TODO write this to a file
        }
    }

    public resetRun() {
        // TODO save the recorded splits for data
        this.recordedSplits = [];
        this.finalTime = -1;
    }
}