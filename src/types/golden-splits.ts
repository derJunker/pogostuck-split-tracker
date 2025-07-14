export interface GoldenSplitsForMode {
    modeIndex: number;
    goldenSplits: ({
        from: number,
        to: number,
        time: number,
    })[],
    pb: number
}

export interface GoldPaceForMode {
    modeIndex: number;
    goldenPaces: {
        splitIndex: number,
        time: number
    }[]
}