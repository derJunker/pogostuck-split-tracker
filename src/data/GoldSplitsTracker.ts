import {GoldenSplitsForMode} from "../types/golden-splits";
import {PbSplitTracker} from "./pb-split-tracker";
import {BrowserWindow, ipcMain} from "electron";
import {writeGoldenSplits} from "../main-process/read-golden-splits";
import {onMapOrModeChanged} from "../main-process/log-event-handler";
import {PogoNameMappings} from "./pogo-name-mappings";
import { SettingsManager } from "../main-process/settings-manager";

export class GoldSplitsTracker {
    private changed: boolean = false;
    private goldenSplits: GoldenSplitsForMode[];
    private settingsManager: SettingsManager;

    constructor(goldenSplits: GoldenSplitsForMode[], settingsManager: SettingsManager) {
        this.goldenSplits = goldenSplits;
        this.settingsManager = settingsManager;
    }

    public getGoldSplitForModeAndSplit(modeIndex: number, from: number, to: number): number|null {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex);
        if (modeSplits) {
            const index = this.findIndexOfGoldSplitWithModeSplitsInfo(modeSplits, from, to)
            if (index !== -1) {
                return modeSplits.goldenSplits[index].time;
            }
        }
        return null;
    }

    private findIndexOfGoldSplitWithModeSplitsInfo(modeSplits: GoldenSplitsForMode, from: number, to: number): number {
        return modeSplits.goldenSplits.findIndex(splitInfo => splitInfo.from === from && splitInfo.to === to);
    }

    public getPbForMode(modeIndex: number): number {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex);
        return modeSplits ? modeSplits.pb : Infinity;
    }

    public getPbs(): { mode: number, time: number }[] {
        return this.goldenSplits.map(gs => ({
            mode: gs.modeIndex,
            time: gs.pb
        }));
    }

    public calcSumOfBest(modeNum: number, splitAmount: number) {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeNum);
        if (modeSplits) {
            const splitPath = this.settingsManager.getSplitIndexPath(modeNum, splitAmount)
            const sumOfBest = splitPath.map(({from, to}) => {
                const goldSplit = this.getGoldSplitForModeAndSplit(modeNum, from, to);
                return (goldSplit !== null && goldSplit > 0) ? goldSplit : Infinity;
            }).reduce((sum, time) => sum + time, 0);
            return sumOfBest === Infinity ? -1 : sumOfBest;
        }
        return -1;
    }

    public updateGoldSplit(modeIndex: number, from:number, to: number, newTime: number): void {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex)!;
        this.changed = true;
        const index = this.findIndexOfGoldSplitWithModeSplitsInfo(modeSplits, from, to);
        if (index !== -1) {
            modeSplits.goldenSplits[index].time = newTime;
        } else {
            modeSplits.goldenSplits.push({from, to, time: newTime});
        }
    }

    public getLastGoldSplitForMode(modeIndex: number, pbSplitTracker: PbSplitTracker, settingsManager: SettingsManager): {time: number, from: number, to: number} {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex);
        if (modeSplits && modeSplits.goldenSplits.length > 0) {
            const to = pbSplitTracker.getSplitAmountForMode(modeIndex);
            const splitIndexPath = settingsManager.getSplitIndexPath(modeIndex, to);
            const from = splitIndexPath.length > 0 ? splitIndexPath[splitIndexPath.length - 1].from : 0;
            const lastGoldSplit = this.getGoldSplitForModeAndSplit(modeIndex, from, to)
            if (lastGoldSplit !== null) {
                return {time: lastGoldSplit, from, to};
            }
            return {time: Infinity, from, to};
        }
        console.warn(`No golden splits found for mode ${modeIndex}`);
        return {time: Infinity, from: -1, to: -1};
    }

    public updatePbForMode(modeIndex: number, newPb: number, pbSplitTracker: PbSplitTracker): void {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex);
        if (modeSplits) {
            if (modeSplits.pb !== newPb) {
                modeSplits.pb = newPb;
                this.changed = true;
                const pbSplits = pbSplitTracker.getPbSplitsForMode(modeIndex)
                const from = pbSplits.length -1 // this is kinda wrong, if there were a map where you skip the last
                // split TODO: fix it when doing custom maps
                const to = from+1;
                const lastSplit = pbSplits[from];
                if (!lastSplit) {
                    console.warn(`No last split found for mode ${modeIndex}, skipping gold split update`);
                    return;
                }
                const oldGoldSplitIndex = this.findIndexOfGoldSplitWithModeSplitsInfo(modeSplits, from, to)
                const oldGoldenSplit = oldGoldSplitIndex !== -1 ? modeSplits.goldenSplits[oldGoldSplitIndex].time : Infinity;
                const splitTime = newPb - lastSplit.time;
                if (splitTime < oldGoldenSplit) {
                    this.updateGoldSplit(modeIndex, from, to, splitTime);
                }
            }
        }
    }

    public hasChanged(): boolean {
        return this.changed;
    }

    public getGoldenSplits() {
        return this.goldenSplits;
    }

    public updateGoldSplitsIfInPbSplits(pbSplitTracker: PbSplitTracker, settingsManager: SettingsManager) {
        const modeSplits = pbSplitTracker.getAllPbSplits();
        modeSplits.forEach(modeSplit => {
            let {mode, times} = modeSplit;
            const splitIndexPath = settingsManager.getSplitIndexPath(mode, times.length)
            splitIndexPath.forEach(({from, to}) => {
                const fromTime = from === -1 ? 0 : pbSplitTracker.getPbTimeForSplit(mode, from);
                let toTime = pbSplitTracker.getPbTimeForSplit(mode, to);
                if (toTime === -1) { // If the "to" is the pb split
                    toTime = this.getPbForMode(mode);
                    if (toTime < 0 || toTime === Infinity) {
                        return;
                    }
                }
                const splitTime = toTime - fromTime;
                const previousGoldSplit = this.getGoldSplitForModeAndSplit(mode, from, to);
                if ((!previousGoldSplit || previousGoldSplit > splitTime) && splitTime > 0) {
                    this.updateGoldSplit(mode, from, to, splitTime);
                }

            })
        })
    }

    public initListeners(overlayWindow: BrowserWindow, goldenSplitsTracker: GoldSplitsTracker, pbSplitTracker: PbSplitTracker,
                         indexToNamesMappings: PogoNameMappings, settingsManager: SettingsManager) {
        ipcMain.handle('pb-entered', (event, modeAndTime: {mode: number, time: number}) => {
            const {mode, time} = modeAndTime;
            const pbTime = this.getPbForMode(mode);
            if (pbTime !== time) {
                console.log(`New PB for mode ${mode}: ${time}`);
                this.updatePbForMode(mode, time, pbSplitTracker);
                writeGoldenSplits(this)
                const mapNum = indexToNamesMappings.getAllLevels()
                    .find(map => map.modes.some(m => m.key === mode))?.mapIndex ?? -1;
                onMapOrModeChanged(mapNum, mode, indexToNamesMappings, pbSplitTracker, goldenSplitsTracker, overlayWindow, settingsManager)
            }
        })
    }

    public changeSaved() {
        this.changed = false;
    }
}