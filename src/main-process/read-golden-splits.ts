import path from "path";
import {app} from "electron";
import fs, {existsSync} from "fs";
import {GoldenSplitsForMode} from "../types/golden-splits";
import {PogoNameMappings} from "../data/pogo-name-mappings";

const goldenSplitFilePath = path.join(app.getPath("userData"), "golden-splits.json");

export function readGoldenSplits(indexToNamesMappings: PogoNameMappings): GoldenSplitsForMode[] {
    if (existsSync(goldenSplitFilePath)) {
        try {
            const data = require(goldenSplitFilePath);
            if (Array.isArray(data)) {
                return data.map((item: any) => ({
                    ...item
                }));
            } else {
                console.error("Expected an array for Golden Splits but got:", typeof data);
                return []
            }
        } catch (error) {
            console.error("Error reading golden splits:", error);
            return []
        }
    } else {
        const allLevels = indexToNamesMappings.getAllLevels()
        const emptyGoldenSplitsWithDefaultValues: GoldenSplitsForMode[] = allLevels.flatMap(level =>
            level.modes.map(mode => {
                return {
                    modeIndex: mode.key,
                    goldenSplits: [],
                    pb: Infinity
                }
            })
        );
        writeGoldenSplits(emptyGoldenSplitsWithDefaultValues)
        return emptyGoldenSplitsWithDefaultValues;
    }
}

export function writeGoldenSplits(goldenSplits: GoldenSplitsForMode[]): void {
    console.log("Writing Golden Splits to file:", goldenSplitFilePath);
    fs.writeFileSync(goldenSplitFilePath, JSON.stringify(goldenSplits, null, 2));
}