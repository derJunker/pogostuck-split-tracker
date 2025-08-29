import {Split} from "./mode-splits";

export interface GoldSplitHistory {
    mode: number,
    splitHistories: {
        split: Split,
        history: number[]
    }[]
}