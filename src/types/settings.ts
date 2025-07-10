export interface Settings {
    // Paths
    pogostuckConfigPath: string;
    pogostuckSteamUserDataPath: string;
    // Design
    hideSkippedSplits: boolean,
    onlyDiffsColored: boolean,
    showNewSplitNames: boolean,
    clickThroughOverlay: boolean,

    // split skips
    skippedSplits: {mode:number, skippedSplitIndices: number[]}[]

    launchPogoOnStartup: boolean;
}

