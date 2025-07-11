import {PogoLevel} from "../../types/pogo-index-mapping";
import log from "electron-log/main";

export class PogoNameMappings {
    private static instance: PogoNameMappings | null = null;
    private readonly nameMappings: PogoLevel[];

    private constructor(nameMappings: PogoLevel[]) {
        this.nameMappings = nameMappings;
    }

    public static getInstance(nameMappings?: PogoLevel[]): PogoNameMappings {
        if (!PogoNameMappings.instance) {
            if (!nameMappings) {
                throw new Error("Instance not initialized. Please provide nameMappings array.");
            }
            PogoNameMappings.instance = new PogoNameMappings(nameMappings);
        }
        return PogoNameMappings.instance;
    }

    public getAllLevels(): PogoLevel[] {
        return this.nameMappings;
    }

    public getMapModeAndSplits(mapIndex: number, modeIndex: number): { map: string, mode: string, splits: string[] } {
        const map = this.nameMappings.find(m => m.mapIndex === mapIndex);
        if (!map) {
            log.info(`Map with index ${mapIndex} not found`)
            return { map: mapIndex + "", mode: modeIndex + "", splits: ["Map not found"]}
        }

        const mode = map.modes.find(m => m.key === modeIndex);
        if (!mode) {
            log.info(`Mode with index ${modeIndex} not found for map ${map.levelName}`);
            return { map: map.levelName, mode: modeIndex + "", splits: ["Mode not found"] }
        }


        return { map: map.levelName, mode: mode.name, splits: map.splits };
    }

    public switchMap1SplitNames(setToNewNames: boolean) {
        const newNames = ["Bones", "Wind", "Grapes", "Tree", "Pineapples", "Palm Trees", "Mushrooms", "Flowers", "Ice"]
        const oldNames = ["Bone Pit", "Grapes", "Tree", "Pineapples", "Palm Trees", "Mushrooms", "Anvil", "Ice", "Egg"];
        const namesToUse = setToNewNames ? newNames : oldNames;
        const map1 = this.nameMappings.find(level => level.mapIndex === 0)!
        map1.splits = map1.splits.map((split, index) => namesToUse[index]);
    }
}