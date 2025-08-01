import path from "path";
import {app, BrowserWindow} from "electron";
import fs, {existsSync} from "fs";
import {GoldenSplitsForMode} from "../../types/golden-splits";
import {PogoNameMappings} from "../data/pogo-name-mappings";
import {GoldSplitsTracker} from "../data/gold-splits-tracker";
import log from "electron-log/main";

const goldenSplitFilePath = path.join(app.getPath("userData"), "golden-splits.json");

export function readGoldenSplits(): GoldenSplitsForMode[] {
    if (existsSync(goldenSplitFilePath)) {
        try {
            const data = require(goldenSplitFilePath);
            if (Array.isArray(data)) {
                return data.map((item: any) => ({
                    ...item
                }));
            } else {
                log.error("Expected an array for Golden Splits but got:", typeof data);
                return []
            }
        } catch (error) {
            log.error("Error reading golden splits:", error);
            return []
        }
    } else {
        const indexToNamesMappings = PogoNameMappings.getInstance();
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

export function writeGoldenSplits(): void {
    const goldenSplitsTracker = GoldSplitsTracker.getInstance();
    const goldenSplits = goldenSplitsTracker.getGoldenSplits();
    goldenSplitsTracker.changeSaved()
    fs.writeFileSync(goldenSplitFilePath, JSON.stringify(goldenSplits, null, 2));
}

export function writeGoldSplitsIfChanged(configWindow: BrowserWindow): void {
    const goldenSplitsTracker = GoldSplitsTracker.getInstance();
    if (goldenSplitsTracker.hasChanged()) {
        writeGoldenSplits();
        configWindow.webContents.send('golden-splits-changed');
    }
}