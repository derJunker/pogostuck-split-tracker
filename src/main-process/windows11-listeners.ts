import {ipcMain, shell} from 'electron';
import * as os from 'os';
import fs from "fs";
import path from "path";

export function initListeners() {
    ipcMain.handle('is-windows-11', () => {
        if (process.platform !== 'win32') return false;
        const [major, minor, build] = os.release().split('.').map(Number);
        return major === 10 && build >= 22000;
    });

    ipcMain.handle('open-windows-settings',async () => {
        if (process.platform === 'win32') {
            const systemRoot = process.env.SystemRoot || "C:\\Windows";
            const settingsPath = path.join(systemRoot, 'System32', 'SystemPropertiesPerformance.exe');
            if (!fs.existsSync(settingsPath)) {
                console.error(`Settings path does not exist: ${settingsPath}`);
                return;
            }
            await shell.openExternal(settingsPath);
        }
    });
}
