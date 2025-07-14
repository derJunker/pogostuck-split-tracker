import path from "path";
import {app, BrowserWindow} from "electron";
import {GoldPaceForMode} from "../../types/golden-splits";
import fs, {existsSync} from "fs";
import {PogoNameMappings} from "../data/pogo-name-mappings";
import {GoldSplitsTracker} from "../data/gold-splits-tracker";
import log from "electron-log/main";
import {GoldPaceTracker} from "../data/gold-pace-tracker";

const goldPacePath = path.join(app.getPath("userData"), "golden-paths.json");

export function readGoldenPaces(): GoldPaceForMode[] {
    if (existsSync(goldPacePath)) {
        try {
            const data = require(goldPacePath);
            if (Array.isArray(data)) {
                log.info(`Loaded Golden Paces from file: ${goldPacePath}`);
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
        log.info(`No golden paces file found at ${goldPacePath}, creating default structure.`);
        const indexToNamesMappings = PogoNameMappings.getInstance();
        const allLevels = indexToNamesMappings.getAllLevels()
        return allLevels.flatMap(level =>
            level.modes.map(mode => {
                return {
                    modeIndex: mode.key,
                    goldenPaces: [],
                }
            })
        )
    }
}

export function writeGoldenPace(): void {
    const goldPaceTracker = GoldPaceTracker.getInstance();
    const goldPaces = goldPaceTracker.getGoldPaces();
    goldPaceTracker.changeSaved()
    fs.writeFileSync(goldPacePath, JSON.stringify(goldPaces, null, 2));
    log.info(`written golden paces to ${goldPacePath}`);
}

export function writeGoldPacesIfChanged(configWindow: BrowserWindow): void {
    const goldenSplitsTracker = GoldSplitsTracker.getInstance();
    if (goldenSplitsTracker.hasChanged()) {
        writeGoldenPace();
        configWindow.webContents.send('golden-paces-changed');
    }
}