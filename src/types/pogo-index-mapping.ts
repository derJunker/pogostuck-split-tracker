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
const pogoIndexMapping: PogoLevelAndModes = {
    level: [
        {
            key: 0,
            name: "Map 1",
            checkpoints: [
                { key: 0, name: "Bones" },
                { key: 1, name: "Wind" },
                { key: 2, name: "Grapes" },
                { key: 3, name: "Tree" },
                { key: 4, name: "Pineapples" }
            ],
            modes: [
                { key: 0, name: "regular" },
                { key: 1, name: "puzzle" },
            ]
        },
        {
            key: 1,
            name: "Map 2",
            checkpoints: [
                { key: 0, name: "Ants" },
                { key: 1, name: "Coconuts" },
                { key: 2, name: "Clovers" },
                { key: 3, name: "Ember" },
                { key: 4, name: "Bees" }
            ],
            modes: [
                { key: 0, name: "regular" },
                { key: 1, name: "double jump" },
            ]
        }
    ]
}