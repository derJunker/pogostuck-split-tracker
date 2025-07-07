import {GoldSplitsTracker} from "./GoldSplitsTracker";
import path from "path";
import {PbSplitTracker} from "./pb-split-tracker";
import {SettingsManager} from "../main-process/settings-manager";
import { PogoNameMappings } from "./pogo-name-mappings";
import {onMapOrModeChanged} from "../main-process/log-event-handler";
import {BrowserWindow} from "electron";

export class CurrentStateTracker {
    private mode: number = -1;
    private map: number = -1;
    private recordedSplits: { split: number, time: number }[] = [];
    private finalTime: number = -1;

    private pb: number = 0;

    private goldSplitsTracker: GoldSplitsTracker;
    private pbTracker: PbSplitTracker;
    private settingsManager: SettingsManager;

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

    public passedSplit(split: number, time: number, lastSplit: { split: number, time: number }): boolean {
        const from = this.recordedSplits.length - 1;
        while (this.recordedSplits.length < lastSplit.split) {
            console.log(`Adding missing split ${this.recordedSplits.length} with time 0`);
            this.recordedSplits.push({split: this.recordedSplits.length, time: 0});
        }
        const splitTime = time - (lastSplit ? lastSplit.time : 0);
        this.recordedSplits.push({split, time: time});
        let goldSplit = this.goldSplitsTracker.getGoldSplitForModeAndSplit(this.mode, from, split)
        if (!goldSplit || goldSplit > splitTime) {
            this.goldSplitsTracker.updateGoldSplit(this.mode, from, split, splitTime)
            console.log(`New best split for ${split}: ${time}`)
            return true;
        } else {
            console.log(`Split passed: ${split} at time ${time}`);
            return false;
        }
    }

    public finishedRun(time: number, skipless: boolean, nameMappings: PogoNameMappings, overlayWindow: BrowserWindow,
                       pbSplitTracker: PbSplitTracker, settingsManager: SettingsManager): void {
        this.finalTime = time;
        console.log(`Run finished with time: ${time}, skipless: ${skipless}`);
        const lastSplit = this.recordedSplits[this.recordedSplits.length - 1]
        const lastDiff = time - lastSplit.time
        const lastGoldSplit = this.goldSplitsTracker.getLastGoldSplitForMode(this.mode, pbSplitTracker, settingsManager)
        if (lastGoldSplit.to >= 0 && lastGoldSplit.time > lastDiff) {
            this.goldSplitsTracker.updateGoldSplit(this.mode, lastGoldSplit.from, lastGoldSplit.to, lastDiff);
            console.log(`New best split for ${lastGoldSplit.from} to ${lastGoldSplit.to} with diff: ${lastDiff}`);
        }
        if (this.finalTime > this.pb) {
            console.log(`New personal best: ${this.finalTime}`);
            this.pb = this.finalTime;
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
            return {
                split: -1,
                time: 0
            }
        }
        return this.recordedSplits[this.recordedSplits.length - 1];
    }
}