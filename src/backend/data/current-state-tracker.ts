import {GoldSplitsTracker} from "./gold-splits-tracker";
import {PbSplitTracker} from "./pb-split-tracker";
import {SettingsManager} from "../settings-manager";
import {isUpsideDownMode} from "./valid-modes";
import log from "electron-log/main";

export class CurrentStateTracker {
    private static instance: CurrentStateTracker | null = null;
    private mode: number = -1;
    private map: number = -1;
    private recordedSplits: { split: number, time: number }[] = [];
    private finalTime: number = -1;
    private pb: number = 0;

    public static getInstance(): CurrentStateTracker {
        if (!CurrentStateTracker.instance) {
            CurrentStateTracker.instance = new CurrentStateTracker();
        }
        return CurrentStateTracker.instance;
    }

    public updateMapAndMode(map: number, mode: number): boolean {
        if (this.map !== map || this.mode !== mode) {
            this.map = map;
            this.mode = mode;
            this.recordedSplits = [];
            this.finalTime = -1;
            this.pb = GoldSplitsTracker.getInstance().getPbForMode(this.mode);
            log.info(`Map changed to ${map}, mode changed to ${mode}`);
            return true;
        }
        return false;
    }

    public passedSplit(split: number, time: number): boolean {
        const settingsManager = SettingsManager.getInstance();
        const goldSplitsTracker = GoldSplitsTracker.getInstance();
        const pbTracker = PbSplitTracker.getInstance();

        const lastSplit = this.getLastSplitTime();
        const from = lastSplit.split;
        log.info(`from: ${from}, split: ${split}, time: ${time}, lastSplit: ${lastSplit.split}, lastTime: ${lastSplit.time}`);
        const existingSplitIndex = this.recordedSplits.findIndex(s => s.split === split);
        if (existingSplitIndex !== -1) {
            const existingSplit = this.recordedSplits.splice(existingSplitIndex, 1)[0];
            this.recordedSplits.push({split: existingSplit.split, time: time});
        }
        const isUD = isUpsideDownMode(this.mode);
        if (lastSplit.split >= split && !isUD) {
            console.warn(`Tried to pass split ${split} but last split was ${lastSplit.split}. Ignoring.`);
            return false
        }
        const splitTime = time - (lastSplit ? lastSplit.time : 0);
        this.recordedSplits.push({split, time: time});
        let goldSplit = goldSplitsTracker.getGoldSplitForModeAndSplit(this.mode, from, split)
        //  Check if the split you passed is on the path you specified (aka you're not coming from a split that is skipped)
        const splitPath = settingsManager.getSplitIndexPath(this.mode, pbTracker.getSplitAmountForMode(this.mode))
        const fromAndToAreInPlannedPath: boolean = splitPath.some(({from, to}) => from === from && to === split);
        if ((!goldSplit || goldSplit && goldSplit > splitTime) && fromAndToAreInPlannedPath) {
            goldSplitsTracker.updateGoldSplit(this.mode, from, split, splitTime)
            log.info(`New gold split for mode ${this.mode} from ${from} to ${split} with time ${splitTime}`);
            return true;
        } else {
            log.info(`No gold split for mode ${this.mode} from ${from} to ${split}, current gold split is ${goldSplit}`);
            log.info(`"goldSplit": ${goldSplit}, "splitTime": ${splitTime}, "goldSplitIsInSplitPath": ${fromAndToAreInPlannedPath}`);
            return false;
        }
    }

    public finishedRun(time: number): void {
        const goldSplitsTracker = GoldSplitsTracker.getInstance();
        const pbTracker = PbSplitTracker.getInstance();
        this.finalTime = time;
        log.info(`Run finished with time: ${time}`);
        const lastSplit = this.recordedSplits[this.recordedSplits.length - 1]
        const lastDiff = time - lastSplit.time
        const lastGoldSplit = goldSplitsTracker.getLastGoldSplitForMode(this.mode)
        log.info(`Last split: ${lastSplit.split}, time: ${lastSplit.time}, last diff: ${lastDiff}`);
        log.info(`last gold split: from ${lastGoldSplit.from}, to ${lastGoldSplit.to}, time: ${lastGoldSplit.time}`);
        if (lastGoldSplit.to >= 0 && lastGoldSplit.time > lastDiff) {
            goldSplitsTracker.updateGoldSplit(this.mode, lastGoldSplit.from, lastGoldSplit.to, lastDiff);
            log.info(`New best split for ${lastGoldSplit.from} to ${lastGoldSplit.to} with diff: ${lastDiff}`);
        }
        if (this.finalTime < this.pb) {
            log.info(`New personal best: ${this.finalTime}`);
            pbTracker.setSplitsForMode(this.mode, this.recordedSplits);
            goldSplitsTracker.updatePbForMode(this.mode, this.finalTime)
            pbTracker.updatePbSplitsFromFile();
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
            if (isUpsideDownMode(this.mode)) {
                return {
                    split: PbSplitTracker.getInstance().getSplitAmountForMode(this.mode),
                    time: 0
                }
            }
            return {
                split: -1,
                time: 0
            }
        }
        return this.recordedSplits[this.recordedSplits.length - 1];
    }
}