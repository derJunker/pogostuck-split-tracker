import {ipcMain} from "electron";
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
    if (isProcessRunning()) return false;
    const settingsManager = SettingsManager.getInstance();
    const steamDirPath = settingsManager.steamPath();
    const steamExePath = process.platform === 'win32'
        ? path.join(steamDirPath, 'steam.exe')
        : path.join(steamDirPath, 'steam.sh'); // Note: Non explicit fallback
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

function isProcessRunning(): boolean {
    try {
        if (process.platform === 'win32') {
            const tasklist = execSync('tasklist', { encoding: 'utf8' });
            if (tasklist.toLowerCase().includes('pogostuck.exe')) {
                log.info('Pogostuck is already running on Windows. Not launching again.');
                return true;
            }
        } else if (process.platform === 'linux') {
            const psOutput = execSync('ps -A', { encoding: 'utf8' });
            const out = psOutput.toLowerCase();
            if (out.includes('pogostuck') || out.includes('pogostuck.exe')) {
                log.info('Pogostuck is already running on Linux. Not launching again.');
                return true;
            }
        } else {
            log.debug(`Skipping process check on unsupported OS: ${process.platform}`);
        }
    } catch (err) {
        log.error('Failed to check running processes:', err);
    }
    return false;
}