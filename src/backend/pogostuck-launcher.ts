import {ipcMain, shell} from "electron";
import {SettingsManager} from "./settings-manager";
import path from "path";
import {spawn, execSync} from "child_process";
import log from "electron-log/main";
import {CurrentStateTracker} from "./data/current-state-tracker";
import fs from "fs";

export function initLaunchPogoListener() {
    ipcMain.handle('open-pogostuck',async () => launchPogostuckIfNotOpenYet());
}

export async function launchPogostuckIfNotOpenYet(): Promise<boolean> {
    const stateTracker = CurrentStateTracker.getInstance();
    if (!stateTracker.steamPathIsValid()) {
        log.error("Trying to launch Pogostuck but Steam path is not valid.");
        return false;
    }
    // Check if pogostuck.exe is already running
    try {
        const tasklist = execSync('tasklist', { encoding: 'utf8' });
        if (tasklist.toLowerCase().includes('pogostuck.exe')) {
            log.info('Trying to launch Pogostuck is already running. Not launching again.');
            return false;
        }
    } catch (err) {
        console.error('Failed to check running processes:', err);
    }
    const settingsManager = SettingsManager.getInstance();
    const steamDirPath = settingsManager.steamPath();
    const steamExePath = path.join(steamDirPath, 'steam.exe');
    if (!fs.existsSync(steamExePath)) {
        log.error(`Steam executable not found at ${steamExePath}. Cannot launch Pogostuck. This should not happen, as steamPathIsValid() should have checked this.`);
        return false;
    }
    const steamAppId = "688130"; // PogoStuck's Steam App ID
    const args = ['-applaunch', steamAppId, '-diag'];
    log.debug(`executing: "${steamExePath} ${args.join(' ')}"`);

    spawn(steamExePath, args, { detached: true, stdio: 'ignore' }).unref();
    return true;
}