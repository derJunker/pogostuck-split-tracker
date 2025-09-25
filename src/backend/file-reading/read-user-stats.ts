import {app} from "electron";
import path from "path";
import {UserModeStats} from "../../types/user-stats-types";
import fs, {existsSync} from "fs";
import log from "electron-log/main";
import {UserStatTracker} from "../data/user-stat-tracker";

const userStatsPath = path.join(app.getPath("userData"), "user-stats.json");

export function readUserStats(): UserModeStats[] {
    if (existsSync(userStatsPath)) {
        try {
            const data = require(userStatsPath);
            if (Array.isArray(data)) {
                log.info(`Loaded User Stats from file: ${userStatsPath}`);
                return data.map((item: any) => ({
                    ...item
                }));
            } else {
                log.error("Expected an array for User Stats but got:", typeof data);
                return []
            }
        } catch (error) {
            log.error("Error reading user stats:", error);
            return []
        }
    } else {
        log.info(`No user stats file found at ${userStatsPath}, creating default structure.`);
        return []
    }
}

export function writeUserStats(): void {
    const userStatTracker = UserStatTracker.getInstance()
    userStatTracker.changeSaved()
    const userStats = userStatTracker.getUserStats();
    fs.writeFileSync(userStatsPath, JSON.stringify(userStats));
    log.info(`written user stats to ${userStatsPath}`);
}

export function writeUserStatsIfChanged(): void {
    const userStatTracker = UserStatTracker.getInstance();
    if (userStatTracker.hasChanged()) {
        writeUserStats();
    }
}