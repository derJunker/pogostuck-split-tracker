export function isValidModeAndMap(map: number, mode: number): boolean {
    const inValidMaps = [110]
    return map >= 0 && isValidMode(mode) && !inValidMaps.includes(map);
}

export function isValidMode(mode: number): boolean {
    const inValidModes = [29]
    return mode >= 0 && !inValidModes.includes(mode);
}

export function isUpsideDownMode(mode: number): boolean {
    const upsideDownModes = [6, 16, 23];
    return upsideDownModes.includes(mode);
}

export function hasUnusedExtraSplit(mode: number): boolean {
    // some of the newer map 1 modes have a unused split for some reason :(
    return [4, 7, 30, 31].includes(mode);
}