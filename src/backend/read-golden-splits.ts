import path from "path";
import {app, BrowserWindow} from "electron";
import fs, {existsSync} from "fs";
import {GoldenSplitsForMode} from "../types/golden-splits";
import {PogoNameMappings} from "./data/pogo-name-mappings";
import {GoldSplitsTracker} from "./data/gold-splits-tracker";

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
        return allLevels.flatMap(level =>
            level.modes.map(mode => {
                return {
                    modeIndex: mode.key,
                    goldenSplits: [],
                    pb: Infinity
                }
            })
        );
    }
}

export function writeGoldenSplits(goldenSplitsTracker: GoldSplitsTracker): void {
    const goldenSplits = goldenSplitsTracker.getGoldenSplits();
    goldenSplitsTracker.changeSaved()
    fs.writeFileSync(goldenSplitFilePath, JSON.stringify(goldenSplits, null, 2));
}

export function writeGoldSplitsIfChanged(goldenSplitsTracker: GoldSplitsTracker, configWindow: BrowserWindow): void {
    if (goldenSplitsTracker.hasChanged()) {
        writeGoldenSplits(goldenSplitsTracker);
        configWindow.webContents.send('golden-splits-changed');
    }
}