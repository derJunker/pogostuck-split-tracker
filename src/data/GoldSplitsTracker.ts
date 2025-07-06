import {GoldenSplitsForMode} from "../types/golden-splits";
import {PbSplitTracker} from "./pb-split-tracker";
import {BrowserWindow, ipcMain} from "electron";
import {writeGoldenSplits} from "../main-process/read-golden-splits";
import {onMapOrModeChanged} from "../main-process/log-event-handler";
import {CurrentStateTracker} from "./current-state-tracker";
import {PogoNameMappings} from "./pogo-name-mappings";
import { SettingsManager } from "../main-process/settings-manager";

export function calculateSplitTimes(times: { split: number, time: number }[], pbTime: number | null): (number)[] {
    const n = times.length;
    const splitTimes: (number)[] = new Array(n + 1).fill(Infinity);
    let lastValidTime: number | null = null;
    let lastValidIdx: number | null = null;
    for (let i = 0; i < n; i++) {
        const t = times[i].time;
        if (!isFinite(t) || t === 0) {
            splitTimes[i] = Infinity;
        } else if (lastValidTime === null) {
            splitTimes[i] = t;
            lastValidTime = t;
            lastValidIdx = i;
        } else {
            splitTimes[i] = t - lastValidTime;
            lastValidTime = t;
            lastValidIdx = i;
        }
    }
    if (lastValidTime !== null && pbTime !== null && isFinite(pbTime)) {
        splitTimes[n] = pbTime - lastValidTime;
    } else {
        splitTimes[n] = Infinity;
    }
    return splitTimes;
}

export class GoldSplitsTracker {
    private changed: boolean = false;
    private goldenSplits: GoldenSplitsForMode[];
    private settingsManager: SettingsManager;

    constructor(goldenSplits: GoldenSplitsForMode[], settingsManager: SettingsManager) {
        this.goldenSplits = goldenSplits;
        this.settingsManager = settingsManager;
    }

    public getGoldSplitForModeAndSplit(modeIndex: number, splitIndex: number): number {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex);
        if (modeSplits) {
            const splitTime = modeSplits.goldenSplits[splitIndex];
            return splitTime !== undefined ? splitTime : Infinity;
        }
        return Infinity;
    }

    public getPbForMode(modeIndex: number): number {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex);
        return modeSplits ? modeSplits.pb : 0;
    }

    public getPbs(): { mode: number, time: number }[] {
        return this.goldenSplits.map(gs => ({
            mode: gs.modeIndex,
            time: gs.pb
        }));
    }

    public getSumOfBest(modeNum: number) {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeNum);
        if (modeSplits) {
            const splits = modeSplits.goldenSplits;
            if (splits.length === 0 || splits[splits.length - 1] === Infinity) {
                return -1;
            }
            const skippedSplits = this.settingsManager.getSplitsToSkipForMode(modeNum)
            console.log(`Skipped splits for mode ${modeNum}: ${skippedSplits}`);
            console.log(`Splits for calc: ${splits.filter(time => time !== Infinity).filter((time, index) => {
                return !skippedSplits.includes(index);
            })}`);
            return splits.filter(time => time !== Infinity).filter((time, index) => {
                return !skippedSplits.includes(index);
            }).reduce((sum, time) => sum + time, 0);
        }
        return -1;
    }

    public updateGoldSplit(modeIndex: number, splitIndex: number, newTime: number): void {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex)!;
        this.changed = true;
        modeSplits.goldenSplits[splitIndex] = newTime;
    }

    public updatePbForMode(modeIndex: number, newPb: number, pbSplitTracker: PbSplitTracker): void {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex);
        if (modeSplits) {
            if (modeSplits.pb !== newPb) {
                modeSplits.pb = newPb;
                const oldGoldenSplit = modeSplits.goldenSplits[modeSplits.goldenSplits.length - 1]
                const pbSplits = pbSplitTracker.getPbSplitsForMode(modeIndex)
                const lastSplit = pbSplits[pbSplits.length - 1];
                const splitTime = newPb - lastSplit.time;
                if (splitTime < oldGoldenSplit) {
                    this.updateGoldSplit(modeIndex, modeSplits.goldenSplits.length - 1, splitTime);
                }
                this.changed = true;
            }
        }
    }

    public hasChanged(): boolean {
        return this.changed;
    }

    public getGoldenSplits() {
        return this.goldenSplits;
    }

    public updateGoldSplitsIfInPbSplits(pbSplitTracker: PbSplitTracker) {
        const modeSplits = pbSplitTracker.getAllPbSplits();
        modeSplits.forEach(modeSplit => {
            let {mode, times} = modeSplit;
            const pbTime = this.getPbForMode(mode);
            const splitTimes = calculateSplitTimes(times, pbTime);
            const goldenSplits = this.goldenSplits.find(gs => gs.modeIndex === mode);
            splitTimes.forEach((time, index) => {
                if (time && time < goldenSplits!.goldenSplits[index] && time > 0) {
                    console.log(`Updating gold split for mode ${mode}, index ${index} to ${time}`);
                    this.updateGoldSplit(mode, index, time);
                }
            });
        })
    }

    public initListeners(overlayWindow: BrowserWindow, goldenSplitsTracker: GoldSplitsTracker, pbSplitTracker: PbSplitTracker, indexToNamesMappings: PogoNameMappings, settingsManager: SettingsManager) {
        ipcMain.handle('pb-entered', (event, modeAndTime: {mode: number, time: number}) => {
            const {mode, time} = modeAndTime;
            const pbTime = this.getPbForMode(mode);
            if (pbTime !== time) {
                console.log(`New PB for mode ${mode}: ${time}`);
                this.updatePbForMode(mode, time, pbSplitTracker);
                writeGoldenSplits(this.goldenSplits)
                const mapNum = indexToNamesMappings.getAllLevels()
                    .find(map => map.modes.some(m => m.key === mode))?.mapIndex ?? -1;
                onMapOrModeChanged(mapNum, mode, indexToNamesMappings, pbSplitTracker, goldenSplitsTracker, overlayWindow, settingsManager)
            }
        })
    }
}