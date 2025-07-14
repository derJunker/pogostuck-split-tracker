import {GoldenSplitsForMode} from "../../types/golden-splits";
import {PbSplitTracker} from "./pb-split-tracker";
import {BrowserWindow, ipcMain} from "electron";
import {writeGoldenSplits} from "../file-reading/read-golden-splits";
import { SettingsManager } from "../settings-manager";
import {redrawSplitDisplay} from "../split-overlay-window";
import {isUpsideDownMode} from "./valid-modes";
import log from "electron-log/main";
import {PogoNameMappings} from "./pogo-name-mappings";
import {UserDataReader} from "./user-data-reader";
import {CurrentStateTracker} from "./current-state-tracker";

export class GoldSplitsTracker {
    private static instance: GoldSplitsTracker | null = null;
    private changed: boolean = false;
    private readonly goldenSplits: GoldenSplitsForMode[];

    private constructor(goldenSplits: GoldenSplitsForMode[]) {
        this.goldenSplits = goldenSplits;
    }

    public static getInstance(goldenSplits?: GoldenSplitsForMode[]): GoldSplitsTracker {
        if (!GoldSplitsTracker.instance) {
            if (!goldenSplits) {
                throw new Error("Instance not initialized. Please provide goldenSplits array.");
            }
            GoldSplitsTracker.instance = new GoldSplitsTracker(goldenSplits);
        }
        return GoldSplitsTracker.instance;
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
            const splitPath = SettingsManager.getInstance().getSplitIndexPath(modeNum, splitAmount)
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
            const to = PbSplitTracker.getInstance().getSplitAmountForMode(modeIndex);
            const splitIndexPath = SettingsManager.getInstance().getSplitIndexPath(modeIndex, to);
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
            log.info(`Updating PB for mode ${modeIndex} from ${modeSplits.pb} to ${newPb}`);
            if (modeSplits.pb !== newPb) {
                const pbSplitTracker = PbSplitTracker.getInstance();
                modeSplits.pb = newPb;
                this.changed = true;

                const path = SettingsManager.getInstance().getSplitIndexPath(modeIndex, pbSplitTracker.getSplitAmountForMode(modeIndex))
                const {from, to} = path[path.length - 1];

                const lastSplitTimeInPbRun = pbSplitTracker.getPbTimeForSplit(modeIndex, from)
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

    public updateGoldSplitsIfInPbSplits() {
        const pbSplitTracker = PbSplitTracker.getInstance();
        const modeSplits = pbSplitTracker.getAllPbSplits();
        modeSplits.forEach(modeSplit => {
            let {mode, times} = modeSplit;
            const splitIndexPath = SettingsManager.getInstance().getSplitIndexPath(mode, times.length)

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
                const splitTime = Math.round((toTime - fromTime) * 1000) / 1000;
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
                writeGoldenSplits()
                const mapNum = indexToNamesMappings.getAllLevels()
                    .find(map => map.modes.some(m => m.key === mode))?.mapIndex ?? -1;
                const currentMode = CurrentStateTracker.getInstance().getCurrentMode();
                if (currentMode === mode)
                    redrawSplitDisplay(mapNum, mode, overlayWindow)
            }
        })

        ipcMain.handle('gold-split-entered', (event, goldSplitInfo: { map: number, mode: number, from: number, to: number, time: number }) => {
            const {map, mode, from, to, time} = goldSplitInfo;
            const isFasterThanCurrentPbSplits = this.isFasterThanCurrentPbSplits(mode, from, to, time);
            if (!isFasterThanCurrentPbSplits) {
                log.warn(`Tried to enter gold split that is not faster than current PB split for mode ${mode}: from ${from} to ${to} with time ${time}`);
                return false
            }

            log.info(`New gold split for map ${map}, mode ${mode}: ${from} -> ${to} = ${time}`);
            this.updateGoldSplit(mode, from, to, time);
            this.changed = true;
            writeGoldenSplits();
            redrawSplitDisplay(map, mode, overlayWindow);
            return true;
        })

        ipcMain.handle('get-gold-splits', (event, mode: number) => {
            const modeSplits = this.goldenSplits.find(gs => gs.modeIndex === mode);
            if (modeSplits) {
                return modeSplits.goldenSplits;
            }
            return [];
        });
        ipcMain.handle("get-pbs", () => this.getPbs())
    }

    private isFasterThanCurrentPbSplits(mode: number, from: number, to: number, time: number): boolean {
        const modeSplitsFromFile = UserDataReader.getInstance().readPbSplitsFromFile()
        const modeSplits = modeSplitsFromFile.find(ms => ms.mode === mode);
        if (!modeSplits) {
            log.error(`No mode splits found for mode ${mode} in pb split entry`);
            return false;
        }
        let fileFrom: number | undefined;
        const isUD = isUpsideDownMode(mode);
        if (!isUD && from === -1) {
            fileFrom = 0;
        } else if (isUD && from === modeSplits.times.length) {
            fileFrom = 0;
        } else {
            fileFrom = modeSplits.times.find(split => split.split === from)?.time;
        }
        let fileTo: number | undefined;
        if (!isUD && to === modeSplits.times.length) {
            fileTo = this.getPbForMode(mode);
        } else if (isUD && to === -1) {
            fileTo = this.getPbForMode(mode);
        } else {
            fileTo = modeSplits.times.find(split => split.split === to)?.time;
        }
        const fileDiff = fileTo !== undefined && fileFrom !== undefined ? fileTo - fileFrom : -1;

        if (fileDiff === -1) {
            log.error(`No split times found for from ${from} or to ${to} in mode ${mode} in pb split entry; isUD: ${isUD}, fileFrom: ${fileFrom}, fileTo: ${fileTo}; fileDiff: ${fileDiff}; time: ${time}`);
            return false;
        }

        if (fileDiff > 0 && time > fileDiff) {
            log.warn(`Gold split time ${time} is greater than or equal to the file diff ${fileDiff} for from ${from} and to ${to} in mode ${mode}`);
            return false;
        }
        log.info(`Gold split time ${time} is faster than the file diff ${fileDiff} for from ${from} and to ${to} in mode ${mode} isUD: ${isUD} fileFrom: ${fileFrom}, fileTo: ${fileTo}`);
        return true;
    }

    public changeSaved() {
        this.changed = false;
    }
}