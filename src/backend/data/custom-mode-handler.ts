import path from "path";
import {app, BrowserWindow, ipcMain} from "electron";
import fs from "fs";
import {PogoLevel} from "../../types/pogo-index-mapping";
import {PogoNameMappings} from "./pogo-name-mappings";
import {CurrentStateTracker} from "./current-state-tracker";
import {redrawSplitDisplay, resetOverlay} from "../split-overlay-window";
import log from "electron-log/main";
import {GoldPaceTracker} from "./gold-pace-tracker";
import {writeGoldPacesIfChanged} from "../file-reading/read-golden-paces";
import {GoldSplitsTracker} from "./gold-splits-tracker";
import {writeGoldSplitsIfChanged} from "../file-reading/read-golden-splits";
import {SettingsManager} from "../settings-manager";
import {BackupGoldSplitTracker} from "./backup-gold-split-tracker";
import {UserStatTracker} from "./user-stat-tracker";
import {CustomModeInfo} from "../../types/CustomMode";

const customModesPath = path.join(app.getPath("userData"), "custom-modes.json");

export class CustomModeHandler {
    private static instance: CustomModeHandler | null = null;


    public static getInstance(): CustomModeHandler {
        if (!CustomModeHandler.instance) {
            CustomModeHandler.instance = new CustomModeHandler();
        }
        return CustomModeHandler.instance;
    }

    public initListeners(overlayWindow: BrowserWindow, configWindow: BrowserWindow) {
        this.initCustomModeList();
        this.initCustomModeFrontendListener(overlayWindow, configWindow);
    }
    private constructor() {}


    private currentCustomMode: number | null = null;
    private mapForCustomMode: number | null = null;
    private underlyingMode: number | null = null;

    private customModes: CustomModeInfo[] = [];


    public setCustomMode(map: number, customMode: number, underlyingMode: number, overlayWindow: BrowserWindow) {
        log.info(`Setting custom mode ${customMode} for map ${map} with underlying mode ${underlyingMode}`);
        this.currentCustomMode = customMode;
        this.underlyingMode = underlyingMode;
        this.mapForCustomMode = map;
        if (underlyingMode !== -1)
            resetOverlay(map, customMode, overlayWindow);
    }

    public isCustomMode(map: number, mode: number): boolean {
        return this.customModes.some(cm => cm.map === map && cm.modeIndex === mode);
    }

    public getCustomModeInfoByMode(mode: number): CustomModeInfo | undefined {
        return this.customModes.find(cm => cm.modeIndex === mode);
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
                customModes.forEach(cm => {
                    if (cm.isRB === undefined) cm.isRB = false;
                })
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
        ipcMain.handle('save-custom-mode-name', async (_, modeIndex: number, newName: string) => {
            const newMappings = this.saveCustomModeName(modeIndex, newName)
            if (this.isPlayingCustomMode() && this.currentCustomMode === modeIndex)
                redrawSplitDisplay(this.mapForCustomMode!, this.currentCustomMode!, overlayWindow);
            return newMappings
        });
        ipcMain.handle('play-custom-mode', async (_, modeIndex: number) => this.playCustomMode(modeIndex, overlayWindow, configWindow));
        ipcMain.handle('delete-custom-mode', async (_, modeIndex: number) => this.deleteCustomMode(modeIndex, configWindow, overlayWindow));
        ipcMain.handle('custom-mode-is-ud-mode-changed', async (_, isUDMode: boolean, modeIndex: number) => this.changeCustomModeIsUDMode(isUDMode, modeIndex));
        ipcMain.handle('custom-mode-is-rb-mode-changed', async (_, isRBMode: boolean, modeIndex: number) => this.changeCustomModeIsRBMode(isRBMode, modeIndex));
    }

    private changeCustomModeIsUDMode(isUDMode: boolean, modeIndex: number) {
        const mode = this.customModes.find(cm => cm.modeIndex === modeIndex);
        if (!mode) {
            log.error(`Custom mode with index ${modeIndex} not found, cannot change UD mode`);
            return;
        }
        const hasChanged = mode.isUD !== isUDMode;
        mode.isUD = isUDMode;
        if(hasChanged) this.saveCustomModesToFile();
    }
    private changeCustomModeIsRBMode(isRBMode: boolean, modeIndex: number) {
        const mode = this.customModes.find(cm => cm.modeIndex === modeIndex);
        if (!mode) {
            log.error(`Custom mode with index ${modeIndex} not found, cannot change UD mode`);
            return;
        }
        const hasChanged = mode.isRB !== isRBMode;
        mode.isRB = isRBMode;
        if (hasChanged) this.saveCustomModesToFile();
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
            modeTimes: [],
            isUD: false,
            isRB: false,
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
        let underlyingMode = stateTracker.getCurrentMode() // this can be -1, if that's the case then somewhere else
        if (this.isPlayingCustomMode() && this.currentCustomMode === underlyingMode) { // basically if the current
            // mode was a custom mode, get the underlying mode of that one
            underlyingMode = this.underlyingMode!;
        }

        this.setCustomMode(customMode.map, customMode.modeIndex, underlyingMode, overlayWindow);
        if (underlyingMode !== -1) stateTracker.updateMapAndMode(customMode.map, customMode.modeIndex, configWindow)
        return true;
    }

    private stopCustomMode(configWindow: BrowserWindow, overlayWindow: BrowserWindow, stateTracker: CurrentStateTracker) {
        const newMode = this.underlyingMode;
        if (newMode === null) {
            log.error("No underlying mode found to switch back to");
            return false;
        }
        this.clearCustomMode(configWindow)
        stateTracker.updateMapAndMode(stateTracker.getCurrentMap(), newMode, configWindow)
        resetOverlay(stateTracker.getCurrentMap(), newMode, overlayWindow);
        return true;
    }

    private deleteCustomMode(modeIndex: number, configWindow: BrowserWindow, overlayWindow: BrowserWindow): void {
        const prevLength = this.customModes.length;
        this.customModes = this.customModes.filter(cm => cm.modeIndex !== modeIndex);
        if (this.customModes.length === prevLength) {
            console.error(`Custom mode with index ${modeIndex} not found, cannot delete`);
            return;
        }
        this.saveCustomModesToFile();

        this.changeModeIfCurrentlyPlayingDeletedMode(modeIndex, configWindow, overlayWindow)

        PogoNameMappings.getInstance().deleteMapping(modeIndex);
        GoldPaceTracker.getInstance().deleteMode(modeIndex);
        writeGoldPacesIfChanged(configWindow)

        GoldSplitsTracker.getInstance().deleteMode(modeIndex);
        writeGoldSplitsIfChanged(configWindow)

        SettingsManager.getInstance().deleteMode(modeIndex);

        BackupGoldSplitTracker.getInstance().deleteMode(modeIndex)

        UserStatTracker.getInstance().deleteMode(modeIndex)
    }

    private changeModeIfCurrentlyPlayingDeletedMode(modeIndex: number, configWindow: BrowserWindow, overlayWindow: BrowserWindow) {
        if (this.currentCustomMode === modeIndex && modeIndex !== -1) {
            log.info(`Currently playing custom mode ${modeIndex} which is now deleted, switching back to underlying mode if possible`);
            const stateTracker = CurrentStateTracker.getInstance()
            let map = -1
            let underlyingMode = -1
            if (this.underlyingMode != null && this.underlyingMode !== -1) {
                map = stateTracker.getCurrentMap();
                underlyingMode = this.underlyingMode;
            }
            log.debug(` map: ${map}, underlyingMode: ${underlyingMode}`);
            this.clearCustomMode(configWindow);
            stateTracker.updateMapAndMode(map, underlyingMode, configWindow, true)
            resetOverlay(map, underlyingMode, overlayWindow);
        }
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