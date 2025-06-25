interface PogoMode {
    key: number;
    mode: string;
}

interface PogoLevel {
    name: string;
    key: number;
    modes: PogoMode[];
}

interface PogoLevelAndModes {
    level: PogoLevel[];
}

// TODO Fill
export const pogoLevelAndModeMappings: PogoLevelAndModes = {
    level: [
        {
            key: 0,
            name: "Map 1",
            modes: [
                { key: 0, mode: "regular" },
            ]
        }
    ]
}