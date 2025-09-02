import path from "path";
import {app} from "electron";
import fs from "fs";

const customModesPath = path.join(app.getPath("userData"), "custom-modes.json");

interface CustomModeInfo {
    map: number,
    modeIndex: number,
    modeTimes: number[]
}

export class CustomModeHandler {
    private static instance: CustomModeHandler | null = null;


    public static getInstance(): CustomModeHandler {
        if (!CustomModeHandler.instance) {
            CustomModeHandler.instance = new CustomModeHandler();
            CustomModeHandler.instance.initCustomModeList();
        }
        return CustomModeHandler.instance;
    }
    private constructor() {}


    private currentCustomMode: number | null = null;
    private mapForCustomMode: number | null = null;
    private underlyingMode: number | null = null;

    private customModes: CustomModeInfo[] = [];


    public setCustomMode(map: number, customMode: number, underlyingMode: number) {
        this.currentCustomMode = customMode;
        this.underlyingMode = underlyingMode;
        this.mapForCustomMode = map;
    }

    public isCustomMode(map: number, mode: number): boolean {
        return this.customModes.some(cm => cm.map === map && cm.modeIndex === mode);
    }

    public clearCustomMode() {
        this.currentCustomMode = null;
        this.mapForCustomMode = null;
        this.underlyingMode = null;
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
            this.customModes = this.createDefaultCustomModesFile();
        }
        this.setCustomMode(0, 100, 0)
    }

    private createDefaultCustomModesFile() {
        const defaultCustomModes: CustomModeInfo[] = [
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
        try {
            fs.writeFileSync(customModesPath, JSON.stringify(defaultCustomModes, null, 4), 'utf-8');
        } catch (error) {
            console.error("Error creating default custom modes file:", error);
        }
        return defaultCustomModes;
    }
}