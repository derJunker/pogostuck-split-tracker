import {GoldSplitsTracker} from "./GoldSplitsTracker";
import path from "path";
import {PbSplitTracker} from "./pb-split-tracker";
import {SettingsManager} from "../main-process/settings-manager";
import {PogoNameMappings} from "./pogo-name-mappings";
import {BrowserWindow} from "electron";
import {isUpsideDownMode} from "./valid-modes";
import {onMapOrModeChanged} from "../main-process/split-overlay-window";

export class CurrentStateTracker {
    private mode: number = -1;
    private map: number = -1;
    private recordedSplits: { split: number, time: number }[] = [];
    private finalTime: number = -1;

    private pb: number = 0;

    private readonly goldSplitsTracker: GoldSplitsTracker;
    private readonly pbTracker: PbSplitTracker;
    private readonly settingsManager: SettingsManager;

    constructor(goldenSplitsTracker: GoldSplitsTracker, pbTracker: PbSplitTracker, settingsManager: SettingsManager) {
        this.goldSplitsTracker = goldenSplitsTracker;
        this.pbTracker = pbTracker;
        this.settingsManager = settingsManager;
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

    public passedSplit(split: number, time: number): boolean {
        const lastSplit = this.getLastSplitTime();
        const from = lastSplit.split;
        console.log(`from: ${from}, split: ${split}, time: ${time}, lastSplit: ${lastSplit.split}, lastTime: ${lastSplit.time}`);
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
        let goldSplit = this.goldSplitsTracker.getGoldSplitForModeAndSplit(this.mode, from, split)
        //  Check if the split you passed is on the path you specified (aka you're not coming from a split that is skipped)
        const splitPath = this.settingsManager.getSplitIndexPath(this.mode, this.pbTracker.getSplitAmountForMode(this.mode))
        const fromAndToAreInPlannedPath: boolean = splitPath.some(({from, to}) => from === from && to === split);
        if ((!goldSplit || goldSplit && goldSplit > splitTime) && fromAndToAreInPlannedPath) {
            this.goldSplitsTracker.updateGoldSplit(this.mode, from, split, splitTime)
            console.log(`New gold split for mode ${this.mode} from ${from} to ${split} with time ${splitTime}`);
            return true;
        } else {
            console.log(`No gold split for mode ${this.mode} from ${from} to ${split}, current gold split is ${goldSplit}`);
            console.log(`"goldSplit": ${goldSplit}, "splitTime": ${splitTime}, "goldSplitIsInSplitPath": ${fromAndToAreInPlannedPath}`);
            return false;
        }
    }

    public finishedRun(time: number, nameMappings: PogoNameMappings, overlayWindow: BrowserWindow): void {
        this.finalTime = time;
        console.log(`Run finished with time: ${time}`);
        const lastSplit = this.recordedSplits[this.recordedSplits.length - 1]
        const lastDiff = time - lastSplit.time
        const lastGoldSplit = this.goldSplitsTracker.getLastGoldSplitForMode(this.mode)
        console.log(`Last split: ${lastSplit.split}, time: ${lastSplit.time}, last diff: ${lastDiff}`);
        console.log(`last gold split: from ${lastGoldSplit.from}, to ${lastGoldSplit.to}, time: ${lastGoldSplit.time}`);
        if (lastGoldSplit.to >= 0 && lastGoldSplit.time > lastDiff) {
            this.goldSplitsTracker.updateGoldSplit(this.mode, lastGoldSplit.from, lastGoldSplit.to, lastDiff);
            console.log(`New best split for ${lastGoldSplit.from} to ${lastGoldSplit.to} with diff: ${lastDiff}`);
        }
        if (this.finalTime < this.pb) {
            console.log(`New personal best: ${this.finalTime}`);
            this.pbTracker.setSplitsForMode(this.mode, this.recordedSplits);
            this.goldSplitsTracker.updatePbForMode(this.mode, this.finalTime)
            this.pbTracker.readPbSplitsFromFile(path.join(this.settingsManager.getPogoStuckSteamUserDataPath(), "settings.txt"), nameMappings);
            onMapOrModeChanged(this.map, this.mode, nameMappings, this.pbTracker, this.goldSplitsTracker, overlayWindow, this.settingsManager);
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
                    split: this.pbTracker.getSplitAmountForMode(this.mode),
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