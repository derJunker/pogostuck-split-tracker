import {ipcMain, shell} from "electron";
import {SettingsManager} from "./settings-manager";
import path from "path";
import {spawn, execSync} from "child_process";
import log from "electron-log/main";

export function initLaunchPogoListener() {
    ipcMain.handle('open-pogostuck',async () => launchPogostuckIfNotOpenYet());
}

export async function launchPogostuckIfNotOpenYet(): Promise<boolean> {
    // Check if pogostuck.exe is already running
    try {
        const tasklist = execSync('tasklist', { encoding: 'utf8' });
        if (tasklist.toLowerCase().includes('pogostuck.exe')) {
            log.info('PogoStuck is already running. Not launching again.');
            return false;
        }
    } catch (err) {
        console.error('Failed to check running processes:', err);
    }
    const steamAppId = "688130"; // PogoStuck's Steam App ID
    const steamUri = `steam://run/${steamAppId}//-diag`;
    shell.openExternal(steamUri);
    return true;
}