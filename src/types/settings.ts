export interface Settings {
    // Paths
    pogostuckConfigPath: string;
    pogostuckSteamUserDataPath: string;
    // Design
    hideSkippedSplits: boolean,
    onlyDiffsColored: boolean,
    showNewSplitNames: boolean,
    clickThroughOverlay: boolean,

    enableBackgroundColor: boolean,
    backgroundColor: string,

    hideWindowWhenPogoNotActive: boolean,

    // split skips
    skippedSplits: {mode:number, skippedSplitIndices: number[]}[]

    launchPogoOnStartup: boolean;

    language: string;
}

