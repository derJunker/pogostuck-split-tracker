export interface PogoLevel {
    levelName: string;
    mapIndex: number;
    splits: string[];
    modes: {
        key: number;
        name: string;
        settingsName: string;
    }[];
}