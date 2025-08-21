import {PogoNameMappings} from "./pogo-name-mappings";
import path from "path";
import {userDataPathEnd} from "./paths";
import fs from "fs";
import log from "electron-log/main";
import {SettingsManager} from "../settings-manager";
import {BrowserWindow, ipcMain} from "electron";
import {ModeSplits} from "../../types/mode-splits";



export class UserDataReader {
    private static instance: UserDataReader | null = null;

    public static getInstance(): UserDataReader {
        if (!UserDataReader.instance) {
            UserDataReader.instance = new UserDataReader();
        }
        return UserDataReader.instance;
    }

    public initListeners() {
        ipcMain.handle("has-fullscreen", () => this.hasFullScreenSet())
    }


    public readPbSplitsFromFile(configWindow?: BrowserWindow, overlayWindow?: BrowserWindow): ModeSplits[] {
        const fileContent = this.readSteamUserData(configWindow, overlayWindow)
        const pogoNameMappings = PogoNameMappings.getInstance();
        if (!fileContent) {
            return [];
        }
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
        const modeMap: { [modeName: string]: number } = {};
        const settingsNames: string[] = [];

        for (const map of (pogoNameMappings as any).nameMappings) {
            for (const mode of map.modes) {
                modeMap[mode.settingsName] = mode.key;
                settingsNames.push(mode.settingsName);
            }
        }

        settingsNames.sort((a, b) => b.length - a.length);

        const tempModeSplits: { mode: number; splitInfo: { split: number, time: number }[] }[] = [];

        for (const line of lines) {
            for (const settingsName of settingsNames) {
                if (line.startsWith(settingsName)) {
                    const rest = line.slice(settingsName.length);
                    const match = rest.match(/^(\d+)\s+([\d.]+)/);
                    if (!match) break;
                    const splitIndex = parseInt(match[1], 10);
                    const time = parseFloat(match[2]);
                    const modeIndex = modeMap[settingsName];
                    if (modeIndex === undefined) break;
                    let modeEntry = tempModeSplits.find(entry => entry.mode === modeIndex);
                    if (!modeEntry) {
                        modeEntry = { mode: modeIndex, splitInfo: [] };
                        tempModeSplits.push(modeEntry);
                    }
                    modeEntry.splitInfo.push({ split: splitIndex, time });
                    break;
                }
            }
        }

        return tempModeSplits.map(entry => ({
            mode: entry.mode,
            times: entry.splitInfo.sort((a, b) => a.split - b.split)
                .filter(splitInfo => [4, 7, 30, 31].indexOf(entry.mode) == -1 || splitInfo.split < 9)
        }));
    }

    public hasFullScreenSet() {
        const fileContent = this.readSteamUserData();
        if (!fileContent) {
            return false;
        }
        // line needed: DisplayMode 1 the number needs to be a group regex
        const fullScreenRegex = /DisplayMode\s+(\d+)/;
        const match = fileContent.match(fullScreenRegex);
        if (match) {
            const displayMode = parseInt(match[1], 10);
            return displayMode === 2;
        }
        log.error("No DisplayMode found in the user data file.");
        return false;

    }


    private readSteamUserData(configWindow?: BrowserWindow, overlayWindow?: BrowserWindow): string | null {
        const settingsManager = SettingsManager.getInstance();
        const filePath = path.join(settingsManager.steamPath(), "userdata", settingsManager.steamFriendCode(), ...userDataPathEnd);
        if (fs.existsSync(filePath)) {
            log.info(`found steam user data file at: ${filePath}`);
            return fs.readFileSync(filePath, 'utf-8');
        }
        log.error(`Steam user data file not found at: ${filePath}`);
        if (configWindow && overlayWindow)
            settingsManager.attemptToFindUserDataPath(configWindow, overlayWindow)
        return null;
    }

}