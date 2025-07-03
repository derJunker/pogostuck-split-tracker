import {PogoLevel} from "../types/pogo-index-mapping";

export class PogoNameMappings {
    private nameMappings: PogoLevel[];

    constructor(nameMappings: PogoLevel[]) {
        this.nameMappings = nameMappings;
    }

    public getAllLevels(): PogoLevel[] {
        return this.nameMappings;
    }

    public getMapModeAndSplits(mapIndex: number, modeIndex: number): { map: string, mode: string, splits: string[] } {
        const map = this.nameMappings.find(m => m.mapIndex === mapIndex);
        if (!map) {
            console.log(`Map with index ${mapIndex} not found`)
            return { map: mapIndex + "", mode: modeIndex + "", splits: ["Map not found"]}
        }

        const mode = map.modes.find(m => m.key === modeIndex);
        if (!mode) {
            console.log(`Mode with index ${modeIndex} not found for map ${map.levelName}`);
            return { map: map.levelName, mode: modeIndex + "", splits: ["Mode not found"] }
        }


        return { map: map.levelName, mode: mode.name, splits: map.splits };
    }
}