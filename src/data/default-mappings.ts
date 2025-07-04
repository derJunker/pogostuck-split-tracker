import {PogoLevel} from "../types/pogo-index-mapping";

export const defaultMappings: PogoLevel[] = [
    {
        levelName: "Map 1",
        mapIndex: 0,
        splits: [ "Bones", "Wind", "Grapes", "Trees", "Pineapples", "Palm Trees", "Mushrooms", "Flowers", "Ice"],
        modes: [
            {
                key: 0,
                name: "Reg",
                settingsName: "Checkpoint"
            },
            {
                key: 1,
                name: "NoSkip",
                settingsName: "Skipless"
            },
            {
                key: 2,
                name: "Invis",
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
            }
        ]
    },
    {
        levelName: "Map 2",
        mapIndex: 8,
        splits: [ "Ants", "Coconuts", "Slopes", "Wind", "Bees", "Vines", "Pillars", "Duck", "Plums", "Snake" ],
        modes: [
            {
                key: 12,
                name: "Reg",
                settingsName: "MonolithDefault"
            },
            {
                key: 13,
                name: "DJ",
                settingsName: "MonolithDouble"
            },
            {
                key: 14,
                name: "720",
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
        modes: [
            {
                key: 20,
                name: "Reg",
                settingsName: "Map3Default"
            },
            {
                key: 21,
                name: "DJ",
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
        modes: [
            {
                key: 30,
                name: "reg",
                settingsName: "Map1SmallRegular_"
            },
            {
                key: 31,
                name: "no boost",
                settingsName: "Map1SmallNoBoost_"
            }
        ]
    },
    {
        levelName: "Dracula's Castle",
        mapIndex: 100,
        splits: ["Mushrooms", "Cellar", "Moving Blocks", "Ice", "Pillars"],
        modes: [
            {
                key: 27,
                name: "reg",
                settingsName: "Drakula_"
            }
        ]
    }
]
