import fs from 'fs'
import {PogoNameMappings} from "./pogo-name-mappings";

interface ModeSplits {
    mode: number,
    times: { split: number, time: number }[]
}

export class PbSplitTracker {
    private modeTimes: ModeSplits[] = [];

    public readPbSplitsFromFile(filePath: string, pogoNameMappings: PogoNameMappings) {
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return;
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
        const modeMap: { [modeName: string]: number } = {};
        const settingsNames: string[] = [];

        // Erzeuge eine Zuordnung von settingsName zu modeIndex für alle Maps
        for (const map of (pogoNameMappings as any).nameMappings) {
            for (const mode of map.modes) {
                modeMap[mode.settingsName] = mode.key;
                settingsNames.push(mode.settingsName);
            }
        }

        // Sortiere settingsNames nach Länge absteigend, damit längere Namen zuerst geprüft werden (verhindert Präfix-Probleme)
        settingsNames.sort((a, b) => b.length - a.length);

        const tempModeSplits: { [mode: number]: { split: number, time: number }[] } = {};

        for (const line of lines) {
            let matched = false;
            for (const settingsName of settingsNames) {
                if (line.startsWith(settingsName)) {
                    const rest = line.slice(settingsName.length);
                    const match = rest.match(/^(\d+)\s+([\d.]+)/);
                    if (!match) break;
                    const splitIndex = parseInt(match[1], 10);
                    const time = parseFloat(match[2]);
                    const modeIndex = modeMap[settingsName];
                    if (modeIndex === undefined) break;
                    if (!tempModeSplits[modeIndex]) tempModeSplits[modeIndex] = [];
                    tempModeSplits[modeIndex].push({ split: splitIndex, time });
                    matched = true;
                    break;
                }
            }
            // Falls keine settingsName matched, ignoriere die Zeile
        }

        this.modeTimes = Object.entries(tempModeSplits).map(([mode, times]) => ({
            mode: Number(mode),
            times: times.sort((a, b) => a.split - b.split)
        }));
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
            console.warn(`No time found for split ${split} in mode ${mode}`);
            return -1;
        }
        return splitTime.time;
    }
}