import path from "path";
import {app, BrowserWindow} from "electron";
import {GoldenPaceForMode, GoldenSplitsForMode} from "../../types/golden-splits";
import fs, {existsSync} from "fs";
import {PogoNameMappings} from "../data/pogo-name-mappings";
import {GoldSplitsTracker} from "../data/gold-splits-tracker";
import log from "electron-log/main";
import {GoldPaceTracker} from "../data/gold-pace-tracker";

const goldPacePath = path.join(app.getPath("userData"), "golden-paths.json");

export function readGoldenPaces(): GoldenPaceForMode[] {
    if (existsSync(goldPacePath)) {
        try {
            const data = require(goldPacePath);
            if (Array.isArray(data)) {
                return data.map((item: any) => ({
                    ...item
                }));
            } else {
                log.error("Expected an array for Golden Paces but got:", typeof data);
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
                    goldenPaces: [],
                }
            })
        );
    }
}

export function writeGoldenPace(): void {
    const goldPaceTracker = GoldPaceTracker.getInstance();
    const goldenSplits = goldPaceTracker.getGoldenPaces();
    goldPaceTracker.changeSaved()
    fs.writeFileSync(goldPacePath, JSON.stringify(goldenSplits, null, 2));
}

export function writeGoldSplitsIfChanged(configWindow: BrowserWindow): void {
    const goldenSplitsTracker = GoldSplitsTracker.getInstance();
    if (goldenSplitsTracker.hasChanged()) {
        writeGoldenPace();
        configWindow.webContents.send('golden-splits-changed');
    }
}