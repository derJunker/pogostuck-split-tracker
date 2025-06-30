import {PogoLevel} from "../types/pogo-index-mapping";

export class PogoNameMappings {
    private nameMappings: PogoLevel[];

    constructor(nameMappings: PogoLevel[]) {
        this.nameMappings = nameMappings;
    }

    public getMapModeAndSplits(mapIndex: number, modeIndex: number) {
        const map = this.nameMappings.find(m => m.mapIndex === mapIndex);
        if (!map) {
            throw new Error(`Map with index ${mapIndex} not found`);
        }

        const mode = map.modes.find(m => m.key === modeIndex);
        if (!mode) {
            throw new Error(`Mode with index ${modeIndex} not found for map ${map.mapLevel}`);
        }


        return { map: map.mapLevel, mode: mode.name, splits: map.splits };
    }
}