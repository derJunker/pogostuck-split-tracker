import {ipcMain, shell} from "electron";
import {SettingsManager} from "./settings-manager";
import path from "path";
import {spawn, execSync} from "child_process";

export function initLaunchPogoListener(settingsManager: SettingsManager) {
    ipcMain.handle('open-pogostuck',async () => launchPogostuckIfNotOpenYet(settingsManager));
}

async function launchPogostuckIfNotOpenYet(settingsManager: SettingsManager): Promise<boolean> {
    // Check if pogostuck.exe is already running
    try {
        const tasklist = execSync('tasklist', { encoding: 'utf8' });
        if (tasklist.toLowerCase().includes('pogostuck.exe')) {
            console.log('PogoStuck is already running. Not launching again.');
            return false;
        }
    } catch (err) {
        console.error('Failed to check running processes:', err);
    }
    const pogostuckDir = settingsManager.getPogostuckPath();
    const pogostuckExecutablePath = path.join(pogostuckDir, "pogostuck.exe");
    console.log(`Launching PogoStuck from: ${pogostuckExecutablePath}`);
    const steamAppId = "688130"; // PogoStuck's Steam App ID
    const steamUri = `steam://run/${steamAppId}//-diag`;
    shell.openExternal(steamUri);
    console.log(`PogoStuck launched via Steam with -diag from: ${steamUri}`);
    return true;
}