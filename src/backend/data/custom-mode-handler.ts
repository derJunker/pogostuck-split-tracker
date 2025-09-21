import path from "path";
import {app, BrowserWindow, ipcMain} from "electron";
import fs from "fs";
import {PogoLevel} from "../../types/pogo-index-mapping";
import {PogoNameMappings} from "./pogo-name-mappings";
import {CurrentStateTracker} from "./current-state-tracker";
import {resetOverlay} from "../split-overlay-window";
import log from "electron-log/main";

const customModesPath = path.join(app.getPath("userData"), "custom-modes.json");

export interface CustomModeInfo {
    map: number,
    modeIndex: number,
    modeTimes: number[]
}

export class CustomModeHandler {
    private static instance: CustomModeHandler | null = null;


    public static getInstance(overlayWindow?: BrowserWindow, configWindow?: BrowserWindow): CustomModeHandler {
        if (!CustomModeHandler.instance) {
            if (!overlayWindow || !configWindow) {
                throw new Error("Overlay and config windows must be provided the first time getInstance is called");
            }
            const instance = new CustomModeHandler();
            CustomModeHandler.instance = instance;
            instance.initCustomModeList();
            instance.initCustomModeFrontendListener(overlayWindow, configWindow);
        }
        return CustomModeHandler.instance;
    }
    private constructor() {}


    private currentCustomMode: number | null = null;
    private mapForCustomMode: number | null = null;
    private underlyingMode: number | null = null;

    private customModes: CustomModeInfo[] = [];


    public setCustomMode(map: number, customMode: number, underlyingMode: number, overlayWindow: BrowserWindow) {
        this.currentCustomMode = customMode;
        this.underlyingMode = underlyingMode;
        this.mapForCustomMode = map;
        resetOverlay(map, customMode, overlayWindow);
    }

    public isCustomMode(map: number, mode: number): boolean {
        return this.customModes.some(cm => cm.map === map && cm.modeIndex === mode);
    }

    public clearCustomMode(configWindow: BrowserWindow) {
        this.currentCustomMode = null;
        this.mapForCustomMode = null;
        this.underlyingMode = null;
        configWindow.webContents.send("custom-mode-stopped")
    }

    public isPlayingCustomMode(): boolean {
        return this.currentCustomMode !== null;
    }

    public getCustomMode(): { map: number | null, customMode: number | null, underlyingMode: number | null } {
        return {map: this.mapForCustomMode, customMode: this.currentCustomMode, underlyingMode: this.underlyingMode};
    }

    public getCustomModeInfos() {
        return this.customModes;
    }

    private initCustomModeList() {
        if (fs.existsSync(customModesPath)) {
            try {
                const data = fs.readFileSync(customModesPath, 'utf-8');
                const customModes: CustomModeInfo[] = JSON.parse(data);
                if (customModes.length === 0) {
                    this.createDefaultCustomModesFile();
                }
                this.customModes = customModes;
            } catch (error) {
                console.error("Error reading custom modes file:", error);
                this.createDefaultCustomModesFile();
            }
        } else {
            this.createDefaultCustomModesFile();
        }
    }

    private initCustomModeFrontendListener(overlayWindow: BrowserWindow, configWindow: BrowserWindow) {
        ipcMain.handle('create-custom-mode', async (event, map: number) => this.createCustomMode(map));
        ipcMain.handle('save-custom-mode-name', async (event, modeIndex: number, newName: string) => this.saveCustomModeName(modeIndex, newName, configWindow));
        ipcMain.handle('play-custom-mode', async (event, modeIndex: number) => this.playCustomMode(modeIndex, overlayWindow, configWindow));
        ipcMain.handle('delete-custom-mode', async (event, modeIndex: number) => this.deleteCustomMode(modeIndex));
    }

    private createCustomMode(map: number): number {
        let newModeIndex = 100;
        let found = false;
        while (!found) {
            if (this.customModes.some(cm => cm.modeIndex === newModeIndex)) {
                newModeIndex++;
            } else {
                found = true;
            }
        }
        const newCustomMode: CustomModeInfo = {
            map,
            modeIndex: newModeIndex,
            modeTimes: []
        };
        this.customModes.push(newCustomMode);
        this.saveCustomModesToFile()
        return newModeIndex;
    }

    private saveCustomModeName(modeIndex: number, newName: string, configWindow: BrowserWindow): PogoLevel[] {
        const pogoNameMappings = PogoNameMappings.getInstance();
        const map = this.customModes.find(cm => cm.modeIndex === modeIndex)?.map;
        if (map === undefined) {
            console.error(`Custom mode with index ${modeIndex} not found`);
            return [];
        }
        pogoNameMappings.renameModeName(map, modeIndex, newName);
        return pogoNameMappings.getAllLevels();
    }

    private playCustomMode(modeIndex: number, overlayWindow: BrowserWindow, configWindow: BrowserWindow): boolean {
        const stateTracker = CurrentStateTracker.getInstance();
        if (modeIndex === -1) {
            const newMode = this.underlyingMode;
            if (newMode === null) {
                console.error("No underlying mode found to switch back to");
                return false;
            }
            this.clearCustomMode(configWindow)
            stateTracker.updateMapAndMode(stateTracker.getCurrentMap(), newMode, configWindow)
            resetOverlay(stateTracker.getCurrentMap(), newMode, overlayWindow);
            return true;
        }
        const customMode = this.customModes.find(cm => cm.modeIndex === modeIndex);
        if (!customMode) {
            log.error(`Custom mode with index ${modeIndex} not found`);
            return false;
        }
        const currentMode = stateTracker.getCurrentMode() // this can be -1, if that's the case then somewhere else it will be set to the then changed mode
        log.debug(`Current mode is ${currentMode}, underlying mode is ${this.underlyingMode}`)
        if (currentMode === -1) {
            log.error(`You are currently not in a valid mode, cannot switch to custom mode ${modeIndex}`);
            return false;
        }
        this.setCustomMode(customMode.map, customMode.modeIndex, currentMode, overlayWindow);
        return true;
    }

    private deleteCustomMode(modeIndex: number): void {
        this.customModes = this.customModes.filter(cm => cm.modeIndex !== modeIndex);
        this.saveCustomModesToFile();
    }

    private createDefaultCustomModesFile() {
        this.customModes = [
            {
                map: 0,
                modeIndex: 100,
                modeTimes: [
                    30,
                    120.410,
                    173.522,
                    191.088,
                    0,
                    256.541,
                    0,
                    // 160.222,
                    292.071,
                    319.936
                ]
            }
        ];
        this.saveCustomModesToFile();
    }

    private saveCustomModesToFile() {
        try {
            fs.writeFileSync(customModesPath, JSON.stringify(this.customModes, null, 4), 'utf-8');
        } catch (error) {
            console.error("Error saving custom modes file:", error);
        }
    }
}