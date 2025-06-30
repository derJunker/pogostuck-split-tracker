interface ModeSplits {
    mode: number,
    times: { split: number, time: number }[]
}

export class PbSplitTracker {
    private modeTimes: ModeSplits[] = [];

    public readPbSplitsFromFile(filePath: string) {

    }
}