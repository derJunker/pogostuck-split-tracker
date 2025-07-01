import path from "path";
import {app} from "electron";
import {existsSync} from "fs";
import fs from "fs";
import {GoldenSplitsForMode} from "../types/golden-splits";

const goldenSplitFilePath = path.join(app.getPath("userData"), "golden-splits.json");

const emptyGoldenSplitsWithDefaultValues: GoldenSplitsForMode[] = [
    // Map 1
    { modeIndex: 0, goldenSplits: [0,0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 1, goldenSplits: [0,0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 2, goldenSplits: [0,0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 3, goldenSplits: [0,0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 4, goldenSplits: [0,0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 6, goldenSplits: [0,0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 7, goldenSplits: [0,0,0,0,0,0,0,0,0], pb: 0 },
    // Map 2
    { modeIndex: 12, goldenSplits: [0,0,0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 13, goldenSplits: [0,0,0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 14, goldenSplits: [0,0,0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 15, goldenSplits: [0,0,0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 16, goldenSplits: [0,0,0,0,0,0,0,0,0,0], pb: 0 },
    // Map 3
    { modeIndex: 20, goldenSplits: [0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 21, goldenSplits: [0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 22, goldenSplits: [0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 23, goldenSplits: [0,0,0,0,0,0,0,0], pb: 0 },
    // Micro Map 1
    { modeIndex: 30, goldenSplits: [0,0,0,0,0,0,0,0,0], pb: 0 },
    { modeIndex: 31, goldenSplits: [0,0,0,0,0,0,0,0,0], pb: 0 },
    // Dracula's Castle
    { modeIndex: 27, goldenSplits: [0,0,0,0,0], pb: 0 },
]

export function readGoldenSplits(): GoldenSplitsForMode[] {
    if (existsSync(goldenSplitFilePath)) {
        try {
            const data = require(goldenSplitFilePath);
            if (Array.isArray(data)) {
                console.log("Loaded Golden Splits from file");
                return data;
            } else {
                console.error("Expected an array for Golden Splits but got:", typeof data);
                return emptyGoldenSplitsWithDefaultValues;
            }
        } catch (error) {
            console.error("Error reading golden splits:", error);
            return emptyGoldenSplitsWithDefaultValues;
        }
    } else {
        fs.writeFileSync(goldenSplitFilePath, JSON.stringify(emptyGoldenSplitsWithDefaultValues, null, 2));
        return emptyGoldenSplitsWithDefaultValues;
    }
}