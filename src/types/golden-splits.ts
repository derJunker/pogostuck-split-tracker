export interface GoldenSplitsForMode {
    modeIndex: number;
    goldenSplits: ({
        from: number,
        to: number,
        time: number,
    })[],
    pb: number
}
