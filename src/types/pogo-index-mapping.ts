export interface PogoLevel {
    levelName: string;
    mapIndex: number;
    splits: string[];
    endSplitName: string,
    modes: {
        key: number;
        name: string;
        settingsName: string;
    }[];
}