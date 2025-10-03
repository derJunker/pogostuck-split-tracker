export interface Settings {
    // Paths
    pogostuckConfigPath: string;
    steamPath: string;
    userFriendCode: string;
    // Options
    hideSkippedSplits: boolean,
    onlyDiffsColored: boolean,
    showResetCounters: boolean,
    reverseUDModes: boolean,
    raceGoldSplits: boolean,
    showNewSplitNames: boolean,
    clickThroughOverlay: boolean,
    showSoB: boolean,
    showPace: boolean

    enableBackgroundColor: boolean,
    backgroundColor: string,

    hideWindowWhenPogoNotActive: boolean,

    // split skips
    skippedSplits: {mode:number, skippedSplitIndices: number[]}[]

    launchPogoOnStartup: boolean;

    language: string;

    lastOpenedTab?: string
}

