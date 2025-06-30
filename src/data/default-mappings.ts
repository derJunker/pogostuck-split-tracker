import {PogoLevel} from "../types/pogo-index-mapping";

export const defaultMappings: PogoLevel[] = [
    {
        mapLevel: "Map 1",
        mapIndex: 0,
        splits: [ "Bones", "Wind", "Grapes", "Trees", "Pineapples", "Palm Trees", "Mushrooms", "Flowers", "Ice"],
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
            }
        ]
    }
]
