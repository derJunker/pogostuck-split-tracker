import {GoldenSplitsForMode} from "../../types/golden-splits";
import {PbSplitTracker} from "./pb-split-tracker";
import {BrowserWindow, ipcMain} from "electron";
import {writeGoldenSplits} from "../read-golden-splits";
import { SettingsManager } from "../settings-manager";
import {redrawSplitDisplay} from "../split-overlay-window";
import {isUpsideDownMode} from "./valid-modes";
import log from "electron-log/main";
import {PogoNameMappings} from "./pogo-name-mappings";

export class GoldSplitsTracker {
    private changed: boolean = false;
    private readonly goldenSplits: GoldenSplitsForMode[];

    private readonly settingsManager: SettingsManager;
    private readonly pbSplitTracker: PbSplitTracker;

    constructor(goldenSplits: GoldenSplitsForMode[], settingsManager: SettingsManager, pbSplitTracker: PbSplitTracker) {
        this.goldenSplits = goldenSplits;

        this.settingsManager = settingsManager;
        this.pbSplitTracker = pbSplitTracker;
    }

    public getGoldSplitForModeAndSplit(modeIndex: number, from: number, to: number): number | null {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex);
        if (modeSplits) {
            const index = this.findIndexOfGoldSplitWithModeSplits(modeSplits, from, to)
            if (index !== -1) {
                return modeSplits.goldenSplits[index].time;
            }
        }
        return null;
    }

    private findIndexOfGoldSplitWithModeSplits(modeSplits: GoldenSplitsForMode, from: number, to: number): number {
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

    public updateGoldSplit(modeIndex: number, from: number, to: number, newTime: number): void {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex)!;
        const index = this.findIndexOfGoldSplitWithModeSplits(modeSplits, from, to);
        this.changed = true;
        if (index !== -1) {
            modeSplits.goldenSplits[index].time = newTime;
        } else {
            modeSplits.goldenSplits.push({from, to, time: newTime});
        }
    }

    public getLastGoldSplitForMode(modeIndex: number): {
        time: number,
        from: number,
        to: number
    } {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex);
        if (modeSplits && modeSplits.goldenSplits.length > 0) {
            const to = this.pbSplitTracker.getSplitAmountForMode(modeIndex);
            const splitIndexPath = this.settingsManager.getSplitIndexPath(modeIndex, to);
            const from = splitIndexPath.length > 0 ? splitIndexPath[splitIndexPath.length - 1].from : 0;
            const lastGoldSplit = this.getGoldSplitForModeAndSplit(modeIndex, from, to)
            if (lastGoldSplit !== null) {
                return {time: lastGoldSplit, from, to};
            }
            return {time: Infinity, from, to};
        }
        log.warn(`No golden splits found for mode ${modeIndex}`);
        return {time: Infinity, from: -1, to: -1};
    }

    public updatePbForMode(modeIndex: number, newPb: number): void {
        const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === modeIndex);
        if (modeSplits) {
            if (modeSplits.pb !== newPb) {
                modeSplits.pb = newPb;
                this.changed = true;

                const path = this.settingsManager.getSplitIndexPath(modeIndex, this.pbSplitTracker.getSplitAmountForMode(modeIndex))
                const {from, to} = path[path.length - 1];

                const lastSplitTimeInPbRun = this.pbSplitTracker.getPbTimeForSplit(modeIndex, from)
                if (lastSplitTimeInPbRun === -1 || lastSplitTimeInPbRun === 0) {
                    log.warn(`No last split found for mode ${modeIndex} in PB splits, skipping gold split update`);
                    log.warn("value: ", lastSplitTimeInPbRun, "path: ", path);
                    return;
                }
                const oldGoldSplitIndex = this.findIndexOfGoldSplitWithModeSplits(modeSplits, from, to)
                const oldGoldenSplit = oldGoldSplitIndex !== -1 ? modeSplits.goldenSplits[oldGoldSplitIndex].time : Infinity;
                const splitTime = newPb - lastSplitTimeInPbRun;
                if (splitTime < oldGoldenSplit && splitTime > 0) {
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

            const isUD = isUpsideDownMode(mode)
            splitIndexPath.forEach(({from, to}) => {
                const isStartFrom = (!isUD && from === -1) || (isUD && from === pbSplitTracker.getSplitAmountForMode(mode))
                const fromTime =  isStartFrom ? 0 : pbSplitTracker.getPbTimeForSplit(mode, from);
                let toTime = pbSplitTracker.getPbTimeForSplit(mode, to);
                if (toTime === -1) { // If the "to" is the pb split
                    toTime = this.getPbForMode(mode);
                    // if (mode === 7)
                    //     console.log("Using pb time: " + toTime);
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

    public initListeners(overlayWindow: BrowserWindow,
                         indexToNamesMappings: PogoNameMappings) {
        ipcMain.handle('pb-entered', (event, modeAndTime: {mode: number, time: number}) => {
            const {mode, time} = modeAndTime;
            const pbTime = this.getPbForMode(mode);
            if (pbTime !== time) {
                log.info(`New PB for mode ${mode}: ${time}`);
                this.updatePbForMode(mode, time);
                writeGoldenSplits(this)
                const mapNum = indexToNamesMappings.getAllLevels()
                    .find(map => map.modes.some(m => m.key === mode))?.mapIndex ?? -1;
                redrawSplitDisplay(mapNum, mode, indexToNamesMappings, this.pbSplitTracker, this, this.settingsManager, overlayWindow)
            }
        })

        ipcMain.handle('gold-split-entered', (event, goldSplitInfo: { map: number, mode: number, from: number, to: number, time: number }) => {
            const {map, mode, from, to, time} = goldSplitInfo;
            log.info(`New gold split for map ${map}, mode ${mode}: ${from} -> ${to} = ${time}`);
            this.updateGoldSplit(mode, from, to, time);
            this.changed = true;
            writeGoldenSplits(this);
            redrawSplitDisplay(map, mode, indexToNamesMappings, this.pbSplitTracker, this, this.settingsManager, overlayWindow);
        })
    }

    public changeSaved() {
        this.changed = false;
    }
}