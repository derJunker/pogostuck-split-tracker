interface KeyToNameMap {
    key: number;
    name: string;
}

interface PogoLevel {
    name: string;
    key: number;
    checkpoints: KeyToNameMap[];
    modes: KeyToNameMap[];
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
            checkpoints: [
                { key: 0, name: "Checkpoint 1" },
                { key: 1, name: "Checkpoint 2" },
                { key: 2, name: "Checkpoint 3" },
                { key: 3, name: "Checkpoint 4" },
                { key: 4, name: "Checkpoint 5" }
            ],
            modes: [
                { key: 0, name: "regular" },
            ]
        }
    ]
}