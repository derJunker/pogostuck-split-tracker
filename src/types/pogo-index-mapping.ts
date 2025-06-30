export interface PogoLevel {
    mapLevel: string;
    mapIndex: number;
    splits: string[];
    modes: {
        key: number;
        name: string;
        settingsName: string;
    }[];
}