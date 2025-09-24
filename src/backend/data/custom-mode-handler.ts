import path from "path";
import {app, BrowserWindow, ipcMain} from "electron";
import fs from "fs";
import {PogoLevel} from "../../types/pogo-index-mapping";
import {PogoNameMappings} from "./pogo-name-mappings";
import {CurrentStateTracker} from "./current-state-tracker";
import {resetOverlay} from "../split-overlay-window";
import log from "electron-log/main";
import {GoldPaceTracker} from "./gold-pace-tracker";
import {writeGoldPacesIfChanged} from "../file-reading/read-golden-paces";
import {GoldSplitsTracker} from "./gold-splits-tracker";
import {writeGoldSplitsIfChanged} from "../file-reading/read-golden-splits";
import {SettingsManager} from "../settings-manager";

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
        if (underlyingMode !== -1)
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
        return this.currentCustomMode !== null && this.mapForCustomMode !== null && this.underlyingMode !== null;
    }

    public getCustomMode(): { map: number, customMode: number, underlyingMode: number } | undefined {
        if (this.currentCustomMode === null || this.mapForCustomMode === null || this.underlyingMode === null) {
            return undefined;
        }
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
        ipcMain.handle('create-custom-mode', async (_, map: number) => this.createCustomMode(map));
        ipcMain.handle('save-custom-mode-name', async (_, modeIndex: number, newName: string) => this.saveCustomModeName(modeIndex, newName));
        ipcMain.handle('play-custom-mode', async (_, modeIndex: number) => this.playCustomMode(modeIndex, overlayWindow, configWindow));
        ipcMain.handle('delete-custom-mode', async (_, modeIndex: number) => this.deleteCustomMode(modeIndex, configWindow));
    }

    private createCustomMode(map: number): { index: number, name: string } {
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
        const name = `Mode ${newModeIndex}`;
        this.saveCustomModeName(newModeIndex, name);
        return { index: newModeIndex, name: name };
    }

    private saveCustomModeName(modeIndex: number, newName: string): PogoLevel[] {
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
        // -1 means stopping the current custom mode
        if (modeIndex === -1) {
            return this.stopCustomMode(configWindow, overlayWindow, stateTracker);
        }
        const customMode = this.customModes.find(cm => cm.modeIndex === modeIndex);
        if (!customMode) {
            log.error(`Custom mode with index ${modeIndex} not found`);
            return false;
        }
        if (customMode.map !== stateTracker.getCurrentMap() && stateTracker.getCurrentMap() !== -1) {
            log.error(`Custom mode with index ${modeIndex} is for map ${customMode.map}, but current map is ${stateTracker.getCurrentMap()}`);
            return false;
        }
        const underlyingMode = stateTracker.getCurrentMode() // this can be -1, if that's the case then somewhere else it will be set to the then changed mode
        this.setCustomMode(customMode.map, customMode.modeIndex, underlyingMode, overlayWindow);
        return true;
    }

    private stopCustomMode(configWindow: BrowserWindow, overlayWindow: BrowserWindow, stateTracker: CurrentStateTracker) {
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

    private deleteCustomMode(modeIndex: number, configWindow: BrowserWindow): void {
        const prevLength = this.customModes.length;
        this.customModes = this.customModes.filter(cm => cm.modeIndex !== modeIndex);
        if (this.customModes.length === prevLength) {
            console.error(`Custom mode with index ${modeIndex} not found, cannot delete`);
            return;
        }
        this.saveCustomModesToFile();

        PogoNameMappings.getInstance().deleteMapping(modeIndex);
        GoldPaceTracker.getInstance().deleteModeIfExists(modeIndex);

        writeGoldPacesIfChanged(configWindow)
        GoldSplitsTracker.getInstance().deleteModeIfExists(modeIndex);

        SettingsManager.getInstance().deleteMode(modeIndex);

        writeGoldSplitsIfChanged(configWindow)
    }

    private createDefaultCustomModesFile() {
        this.customModes = [

        ];
        this.saveCustomModesToFile();
    }

    public updateCustomModePbTimes(modeIndex: number, newTimes: number[]) {
        log.info(`updating custom mode ${modeIndex} with new times: ${newTimes}`);
        const customMode = this.customModes.find(cm => cm.modeIndex === modeIndex);
        if (!customMode) {
            log.error(`Custom mode with index ${modeIndex} not found, cannot update times`);
            return;
        }
        customMode.modeTimes = newTimes;
        this.saveCustomModesToFile();
    }

    private saveCustomModesToFile() {
        try {
            fs.writeFileSync(customModesPath, JSON.stringify(this.customModes, null, 4), 'utf-8');
            log.info(`Custom modes saved to ${customModesPath}`);
        } catch (error) {
            console.error("Error saving custom modes file:", error);
        }
    }
}