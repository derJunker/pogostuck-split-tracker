import fs from 'fs'
import {PogoNameMappings} from "./pogo-name-mappings";
import {SettingsManager} from "../settings-manager";
import path from "path";
import {userDataPathEnd} from "./paths";

interface ModeSplits {
    mode: number,
    times: { split: number, time: number }[]
}

export class PbSplitTracker {
    private modeTimes: ModeSplits[] = [];
    private settingsManager: SettingsManager;


    constructor(settingsManager: SettingsManager) {
        this.settingsManager = settingsManager;
    }

    public readPbSplitsFromFile(pogoNameMappings: PogoNameMappings) {
        const filePath = path.join(this.settingsManager.steamUserDataPath(), ...userDataPathEnd)
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return;
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
        const modeMap: { [modeName: string]: number } = {};
        const settingsNames: string[] = [];

        for (const map of (pogoNameMappings as any).nameMappings) {
            for (const mode of map.modes) {
                modeMap[mode.settingsName] = mode.key;
                settingsNames.push(mode.settingsName);
            }
        }

        settingsNames.sort((a, b) => b.length - a.length);

        const tempModeSplits: { mode: number; splitInfo: { split: number, time: number }[] }[] = [];

        for (const line of lines) {
            for (const settingsName of settingsNames) {
                if (line.startsWith(settingsName)) {
                    const rest = line.slice(settingsName.length);
                    const match = rest.match(/^(\d+)\s+([\d.]+)/);
                    if (!match) break;
                    const splitIndex = parseInt(match[1], 10);
                    const time = parseFloat(match[2]);
                    const modeIndex = modeMap[settingsName];
                    if (modeIndex === undefined) break;
                    let modeEntry = tempModeSplits.find(entry => entry.mode === modeIndex);
                    if (!modeEntry) {
                        modeEntry = { mode: modeIndex, splitInfo: [] };
                        tempModeSplits.push(modeEntry);
                    }
                    modeEntry.splitInfo.push({ split: splitIndex, time });
                    break;
                }
            }
        }

        this.modeTimes = tempModeSplits.map(entry => ({
            mode: entry.mode,
            times: entry.splitInfo.sort((a, b) => a.split - b.split)
                .filter(splitInfo => [4, 7, 30, 31].indexOf(entry.mode) == -1 || splitInfo.split < 9)
        }));
    }

    public getSplitAmountForMode(mode: number): number {
        const modeSplits = this.modeTimes.find(m => m.mode === mode);
        if (!modeSplits) {
            return 0;
        }
        return modeSplits.times.length;
    }

    public getPbSplitsForMode(mode: number): { split: number, time: number }[] {
        const modeSplits = this.modeTimes.find(m => m.mode === mode);
        if (!modeSplits) {
            console.warn(`No splits found for mode ${mode}`);
            return [];
        }
        return modeSplits.times;
    }

    public getPbTimeForSplit(mode: number, split: number) {
        const modeSplits = this.modeTimes.find(m => m.mode === mode);
        if (!modeSplits) {
            console.warn(`No splits found for mode ${mode}`);
            return -1;
        }
        const splitTime = modeSplits.times.find(s => s.split === split);
        if (!splitTime) {
            return -1;
        }
        return splitTime.time;
    }

    public getAllPbSplits(): ModeSplits[] {
        return this.modeTimes;
    }

    public setSplitsForMode(mode: number, recordedSplits: { split: number; time: number }[]) {
        const modeSplits = this.modeTimes.find(m => m.mode === mode);
        if (!modeSplits) {
            console.warn(`No splits found for mode ${mode}, creating new entry.`);
            this.modeTimes.push({ mode, times: recordedSplits });
        } else {
            // keeping old ones but adding and overriding with new ones
            const splitMap = new Map<number, number>();
            modeSplits.times.forEach(s => splitMap.set(s.split, s.time));
            recordedSplits.forEach(s => splitMap.set(s.split, s.time));
            modeSplits.times = Array.from(splitMap.entries())
                .map(([split, time]) => ({ split, time }))
                .sort((a, b) => a.split - b.split);
        }
    }
}