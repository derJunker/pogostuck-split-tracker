import {GoldPaceForMode} from "../../types/golden-splits";
import {PbSplitTracker} from "./pb-split-tracker";
import {SettingsManager} from "../settings-manager";
import {isUpsideDownMode} from "./valid-modes";
import log from "electron-log/main";
import {BrowserWindow, ipcMain} from "electron";
import {writeGoldenPace} from "../file-reading/read-golden-paces";

export class GoldPaceTracker {
    private static instance: GoldPaceTracker;
    private changed: boolean = false;
    private readonly goldPaces: GoldPaceForMode[] = [];

    private constructor(goldPaces: GoldPaceForMode[]) {
        this.goldPaces = goldPaces;
    }

    public static getInstance(goldPaces?: GoldPaceForMode[]): GoldPaceTracker {
        if (!GoldPaceTracker.instance) {
            if (!goldPaces) {
                throw new Error("GoldPaceTracker not initialized with necessary gold paces");
            }
            GoldPaceTracker.instance = new GoldPaceTracker(goldPaces);
        }
        return GoldPaceTracker.instance;
    }

    public initListeners(overlayWindow: BrowserWindow) {
        ipcMain.handle('gold-pace-entered', (event, goldPaceInfo: { map: number, mode: number, splitIndex: number, time: number }) => {
            const {map, mode , splitIndex, time} = goldPaceInfo;
            const isFasterThanCurrentPbPace = this.isFasterThanCurrentPbPace(mode, splitIndex, time);
            if (!isFasterThanCurrentPbPace) {
                log.warn(`Gold pace for map ${map}, mode ${mode}, splitIndex ${splitIndex} is not faster than current PB pace.`);
                return false;
            }
            log.info(`Gold pace for map ${map}, mode ${mode}, splitIndex ${splitIndex} with time ${time} entered.`);
            this.updateGoldPace(mode, splitIndex, time);
            writeGoldenPace();
            return true;
        });

        ipcMain.handle('get-gold-paces', (event, mode: number) => {
            const goldPacesForMode = this.getGoldPacesForMode(mode);
            if (goldPacesForMode) {
                return goldPacesForMode.goldenPaces;
            } else {
                log.warn(`No gold paces found for mode ${mode}`);
                return [];
            }
        })
    }

    private isFasterThanCurrentPbPace(mode: number, splitIndex: number, time: number): boolean {
        if (time === 0)
            return true; // you can set your time to 0
        const pbSplitTracker = PbSplitTracker.getInstance();
        const pbSplits = pbSplitTracker.getPbSplitsForMode(mode);
        if (!pbSplits || pbSplits.length === 0) {
            log.warn(`No PB splits found for mode ${mode}, treating gold pace as valid.`);
            return true; // no PB splits, so any gold pace is valid
        }
        const pbSplit = pbSplits.find(splitInfo => splitInfo.split === splitIndex);
        if (!pbSplit) {
            log.warn(`No PB split found for mode ${mode} and split index ${splitIndex}, treating gold pace as valid.`);
            return true; // no PB split for this index, so any gold pace is valid
        }
        const isUD = isUpsideDownMode(mode);
        log.info(`Checking if gold pace for mode ${mode}, split index ${splitIndex} with time ${time} is faster than PB time ${pbSplit.time}. Is UD: ${isUD}`);
        if (isUD) {
            return time >= pbSplit.time;
        } else {
            return time <= pbSplit.time;
        }
    }

    public updateGoldPace(mode: number, splitIndex: number, time: number): void {
        const goldPacesForMode = this.getGoldPacesForMode(mode);
        if (!goldPacesForMode) {
            log.warn(`No gold paces found for mode ${mode}, creating new entry.`);
            this.goldPaces.push({
                modeIndex: mode,
                goldenPaces: [{
                    splitIndex: splitIndex,
                    time: time
                }]
            });
            this.changed = true;
        } else {
            const existingGoldPace = this.getGoldPaceForSplit(goldPacesForMode, splitIndex);
            if (existingGoldPace) {
                if (existingGoldPace.time !== time) {
                    existingGoldPace.time = time;
                    this.changed = true;
                }
            } else {
                goldPacesForMode.goldenPaces.push({
                    splitIndex: splitIndex,
                    time: time
                });
                this.changed = true;
            }
        }
    }


    public getGoldPaces(): GoldPaceForMode[] {
        return this.goldPaces;
    }

    public updateGoldPacesIfInPbSplits() {
        const pbSplitTracker = PbSplitTracker.getInstance();
        const modeSplits = pbSplitTracker.getAllPbSplits();
        modeSplits.forEach(modeSplit => {
            let {mode, times} = modeSplit;
            const isUD = isUpsideDownMode(mode)
            const goldPacesForMode = this.getGoldPacesForMode(mode);
            if (!goldPacesForMode) return // TODO adjust prolly
            times.forEach((splitInfo) => {
                const goldPace = this.getGoldPaceForSplit(goldPacesForMode, splitInfo.split)
                if (!goldPace || (!isUD && goldPace.time > splitInfo.time || (isUD && goldPace.time < splitInfo.time))) {
                    this.changed = true;
                    const indexOfSplit = goldPacesForMode.goldenPaces.findIndex(p => p.splitIndex === splitInfo.split);
                    if (indexOfSplit === -1) {
                        goldPacesForMode.goldenPaces.push({
                            splitIndex: splitInfo.split,
                            time: splitInfo.time
                        })
                    } else {
                        goldPacesForMode.goldenPaces[indexOfSplit].time = splitInfo.time;
                    }
                }
            })
        })
    }

    private getGoldPacesForMode(mode: number): GoldPaceForMode | undefined {
        return this.goldPaces.find(pace => pace.modeIndex === mode);
    }

    private getGoldPaceForSplit(goldPacesForMode: GoldPaceForMode, split: number) {
        return goldPacesForMode.goldenPaces.find(p => p.splitIndex === split);
    }

    public changeSaved(): void {
        this.changed = false;
    }

    public hasChanged(): boolean {
        return this.changed;
    }

}