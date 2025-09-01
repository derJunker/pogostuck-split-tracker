import {PogoLevel} from "../../types/pogo-index-mapping";

export const defaultMappings: PogoLevel[] = [
    {
        levelName: "Map 1",
        mapIndex: 0,
        splits: [ "Bones", "Wind", "Grapes", "Trees", "Pineapples", "Palm Trees", "Mushrooms", "Flowers", "Ice"],
        endSplitName: "Egg",
        modes: [
            {
                key: 0,
                name: "Regular",
                settingsName: "Checkpoint"
            },
            {
                key: 1,
                name: "Skipless",
                settingsName: "Skipless"
            },
            {
                key: 2,
                name: "Invisible",
                settingsName: "Invisible"
            },
            {
                key: 3,
                name: "Ice",
                settingsName: "Ice"
            },
            {
                key: 4,
                name: "NAS",
                settingsName: "NoAnvilSkip_"
            },
            {
                key: 6,
                name: "UD",
                settingsName: "Map1UD_"
            },
            {
                key: 7,
                name: "Puzzle",
                settingsName: "Map1Puzzle_"
            },
            {
                key: 8,
                name: "Boostless",
                custom: true
            }
        ]
    },
    {
        levelName: "Map 2",
        mapIndex: 8,
        splits: [ "Ants", "Coconuts", "Slopes", "Wind", "Bees", "Vines", "Pillars", "Duck", "Plums", "Snake" ],
        endSplitName: "Finale",
        modes: [
            {
                key: 12,
                name: "Regular",
                settingsName: "MonolithDefault"
            },
            {
                key: 13,
                name: "Double-Jump",
                settingsName: "MonolithDouble"
            },
            {
                key: 14,
                name: "720°",
                settingsName: "Monolith720_"
            },
            {
                key: 15,
                name: "Puzzle",
                settingsName: "MonolithPuzzle_"
            },
            {
                key: 16,
                name: "UD",
                settingsName: "MonolithUpDown_"
            }
        ]
    },
    {
        levelName: "Map 3",
        mapIndex: 9,
        splits: ["Checkpoint 1", "Checkpoint 2", "Checkpoint 3", "Checkpoint 4", "Checkpoint 5", "Checkpoint 6", "Checkpoint 7", "Checkpoint 8"],
        endSplitName: "Finale",
        modes: [
            {
                key: 20,
                name: "Regular",
                settingsName: "Map3Default"
            },
            {
                key: 21,
                name: "Double-Jump",
                settingsName: "Map3Boost"
            },
            {
                key: 22,
                name: "Puzzle",
                settingsName: "Map3Puzzle"
            },
            {
                key: 23,
                name: "UD",
                settingsName: "Map3UpsideDown_"
            }
        ]
    },
    {
        levelName: "Micro Map 1",
        mapIndex: 99,
        splits: ["Bones", "Wind", "Grapes", "Trees", "Pineapples", "Palm Trees", "Mushrooms", "Flowers", "Ice"],
        endSplitName: "Egg",
        modes: [
            {
                key: 30,
                name: "Regular",
                settingsName: "Map1SmallRegular_"
            },
            {
                key: 31,
                name: "Boostless",
                settingsName: "Map1SmallNoBoost_"
            }
        ]
    },
    {
        levelName: "Drakula's Castle",
        mapIndex: 100,
        splits: ["Mushrooms", "Cellar", "Moving Blocks", "Ice", "Pillars"],
        endSplitName: "Tower",
        modes: [
            {
                key: 27,
                name: "Regular",
                settingsName: "Drakula_"
            }
        ]
    }
]
