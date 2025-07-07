import {ipcMain, shell} from 'electron';
import * as os from 'os';

export function initListeners() {
    ipcMain.handle('is-windows-11', () => {
        if (process.platform !== 'win32') return false;
        const [major, minor, build] = os.release().split('.').map(Number);
        return major === 10 && build >= 22000;
    });

    ipcMain.handle('open-windows-settings',async () => {
        if (process.platform === 'win32') {
            const systemRoot = process.env.SystemRoot || 'C://Windows';
            await shell.openExternal(`${systemRoot}\\System32\\SystemPropertiesPerformance.exe`);
        }
    });
}
