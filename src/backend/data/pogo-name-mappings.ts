import {PogoLevel} from "../../types/pogo-index-mapping";
import log from "electron-log/main";
import path from "path";
import {app} from "electron";
import fs from "fs";
import {defaultMappings} from "./default-mappings";

const mappingsPath = path.join(app.getPath("userData"), "mappings.json");

export class PogoNameMappings {
    private static instance: PogoNameMappings | null = null;
    private readonly nameMappings: PogoLevel[];

    private constructor() {
        this.nameMappings = this.readMappingsFromFile();
        this.migrateMap3MapNames()
    }

    public static getInstance(): PogoNameMappings {
        if (!PogoNameMappings.instance) {
            PogoNameMappings.instance = new PogoNameMappings();
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
            return { map: map.levelName, mode: modeIndex + "", splits: ["Invalid Mode"] }
        }


        return { map: map.levelName, mode: mode.name, splits: map.splits };
    }

    public switchMap1SplitNames(setToNewNames: boolean) {
        const newNames = ["Bones", "Wind", "Grapes", "Tree", "Pineapples", "Palm Trees", "Mushrooms", "Flowers", "Ice"]
        const oldNames = ["Bone Pit", "Grapes", "Tree", "Pineapples", "Palm Trees", "Mushrooms", "Anvil", "Ice", "Egg"];
        const namesToUse = setToNewNames ? newNames : oldNames;
        const mapsWithOldNames = this.nameMappings.filter(level => level.mapIndex === 0 || level.mapIndex === 99)
        mapsWithOldNames.forEach(pogoMap => pogoMap.splits = pogoMap.splits.map((_split, index) => namesToUse[index]))
    }

    public renameModeName(mapIndex: number, modeIndex: number, newName: string) {
        const map = this.nameMappings.find(m => m.mapIndex === mapIndex);
        if (!map) {
            log.info(`Map with index ${mapIndex} not found`)
            return;
        }

        let mode = map.modes.find(m => m.key === modeIndex);
        if (!mode) {
            log.info(`Mode with index ${modeIndex} not found for map ${map.levelName}`);
            mode = { key: modeIndex, name: newName };
            map.modes.push(mode);
        } else {
            mode.name = newName;
        }
        this.saveMappingsToFile();
    }

    private saveMappingsToFile() {
        try {
            const data = JSON.stringify(this.nameMappings, null, 2);
            fs.writeFileSync(mappingsPath, data, 'utf-8');
            log.info(`Mappings saved to ${mappingsPath}`);
        } catch (error) {
            log.error("Error saving mappings to file:", error);
        }
    }

    private readMappingsFromFile(): PogoLevel[] {
        if (!fs.existsSync(mappingsPath)) {
            log.info(`Mappings file does not exist at ${mappingsPath}`);
            return defaultMappings;
        }
        try {
            const data = fs.readFileSync(mappingsPath, 'utf-8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                log.info(`Loaded mappings from file at ${mappingsPath}`);
                return parsed;
            } else {
                log.error(`Something went wrong loading your mappings, expected an array but got: ${typeof parsed}`);
                return defaultMappings;
            }
        } catch (error) {
            log.error(`Something went wrong loading your mappings from ${mappingsPath}, using default mappings instead. Error:`, error);
            return defaultMappings;
        }
    }

    public deleteMapping(modeIndex: number) {
        let modified = false;
        this.nameMappings.forEach(map => {
            const modeIndexInMap = map.modes.findIndex(m => m.key === modeIndex);
            if (modeIndexInMap !== -1) {
                map.modes.splice(modeIndexInMap, 1);
                modified = true;
            }
        });
        if (modified) {
            this.saveMappingsToFile();
            log.info(`Deleted mode ${modeIndex} from mappings`);
        }
    }

    private migrateMap3MapNames() {
        const map3Mappings = this.nameMappings.find(map => map.mapIndex === 9)
        log.info("checking if map 3 mappings should be migrated")
        if (!map3Mappings) {
            log.error(`idk how but map 3 splits are not existent!?`)
            return;
        }
        const newSplitNames = [
            "CHKP 1",
            "CHKP 2",
            "CHKP 3",
            "CHKP 4",
            "CHKP 5",
            "CHKP 6",
            "CHKP 7",
            "CHKP 8"
        ]
        if (newSplitNames.length !== map3Mappings.splits.length) {
            throw new Error("New map3 mappings are the wrong length!")
        }
        let allMatch = true;
        for (let i  = 0; i < newSplitNames.length; i++) {
            const currentSplitName = map3Mappings.splits[i];
            const newSplitName = newSplitNames[i];
            if (newSplitName !==  currentSplitName) {
                log.info(`difference in split detected: ${currentSplitName} -> ${newSplitName}; migrating now`);
                allMatch = false;
                break;
            }
        }
        if (allMatch) {
            log.info("mappings already migrated")
            return;
        }
        map3Mappings.splits = newSplitNames;
        this.saveMappingsToFile();
    }
}