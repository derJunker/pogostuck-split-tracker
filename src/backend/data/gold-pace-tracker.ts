import {GoldPaceForMode} from "../../types/golden-splits";
import {PbSplitTracker} from "./pb-split-tracker";
import {SettingsManager} from "../settings-manager";
import {isUpsideDownMode} from "./valid-modes";
import log from "electron-log/main";

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