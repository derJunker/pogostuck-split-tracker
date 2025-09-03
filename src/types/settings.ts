export interface Settings {
    // Paths
    pogostuckConfigPath: string;
    steamPath: string;
    userFriendCode: string;
    // Design
    hideSkippedSplits: boolean,
    onlyDiffsColored: boolean,
    raceGoldSplits: boolean,
    showNewSplitNames: boolean,
    clickThroughOverlay: boolean,

    enableBackgroundColor: boolean,
    backgroundColor: string,

    hideWindowWhenPogoNotActive: boolean,

    // split skips
    skippedSplits: {mode:number, skippedSplitIndices: number[]}[]

    launchPogoOnStartup: boolean;

    language: string;

    lastOpenedTab?: string
}

