export function isValidModeAndMap(map: number, mode: number): boolean {
    const inValidModes = [29]
    const inValidMaps = [110]
    console.log(`Checking if mode ${mode} and map ${map} are valid: ${mode >= 0 && map >= 0 && !inValidModes.includes(mode) && !inValidMaps.includes(map)}`);
    return mode >= 0 && map >= 0 && !inValidModes.includes(mode) && !inValidMaps.includes(map);
}