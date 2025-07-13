import {GoldenPaceForMode} from "../../types/golden-splits";
import {PbSplitTracker} from "./pb-split-tracker";
import {SettingsManager} from "../settings-manager";
import {isUpsideDownMode} from "./valid-modes";
import log from "electron-log/main";

export class GoldPaceTracker {
    private static instance: GoldPaceTracker;
    private changed: boolean = false;
    private readonly goldenPaces: GoldenPaceForMode[] = [];

    private constructor() {
    }

    public static getInstance(): GoldPaceTracker {
        if (!GoldPaceTracker.instance) {
            GoldPaceTracker.instance = new GoldPaceTracker();
        }
        return GoldPaceTracker.instance;
    }

    public getGoldenPaces(): GoldenPaceForMode[] {
        return this.goldenPaces;
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
                    log.info(`Updating gold pace for mode ${mode} split ${splitInfo.split} to ${splitInfo.time}`);
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

    private getGoldPacesForMode(mode: number): GoldenPaceForMode | undefined {
        return this.goldenPaces.find(pace => pace.modeIndex === mode);
    }

    private getGoldPaceForSplit(goldPacesForMode: GoldenPaceForMode, split: number) {
        return goldPacesForMode.goldenPaces.find(p => p.splitIndex === split);
    }

    public changeSaved(): void {
        this.changed = false;
    }

    public hasChanged(): boolean {
        return this.changed;
    }

}