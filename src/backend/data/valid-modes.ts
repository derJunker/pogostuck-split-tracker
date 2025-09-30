import {CustomModeHandler} from "./custom-mode-handler";
import log from "electron-log/main";

export function isValidModeAndMap(map: number, mode: number): boolean {
    const invalidMaps = [110] // UD map
    return map >= 0 && isValidMode(mode) && !invalidMaps.includes(map);
}

export function isValidMode(mode: number): boolean {
    const invalidModes = [29] // The Custom map mode
    return mode >= 0 && !invalidModes.includes(mode);
}

export function isUpsideDownMode(mode: number): boolean {
    const customModeHandler = CustomModeHandler.getInstance()
    const cm = customModeHandler.getCustomModeInfoByMode(mode)
    if (cm) return cm.isUD;
    const upsideDownModes = [6, 16, 23];

    return upsideDownModes.includes(mode);
}

export function isRBMode(mode: number): boolean {
    const customModeHandler = CustomModeHandler.getInstance()
    const cm = customModeHandler.getCustomModeInfoByMode(mode)
    if (cm) return cm.isRB;
    return false;
}

export function hasUnusedExtraSplit(mode: number): boolean {
    // some of the newer map 1 modes have a unused split for some reason :(
    return [4, 7, 30, 31].includes(mode);
}