export class CustomModeHandler {
    private static instance: CustomModeHandler | null = null;
    public static getInstance(): CustomModeHandler {
        if (!CustomModeHandler.instance) {
            CustomModeHandler.instance = new CustomModeHandler();
        }
        return CustomModeHandler.instance;
    }
    private constructor() {}


    private currentCustomMode: number | null = 100;
    private mapForCustomMode: number | null = 0;
    private underlyingMode: number | null = 0;


    public setCustomMode(map: number, customMode: number, underlyingMode: number) {
        this.currentCustomMode = customMode;
        this.underlyingMode = underlyingMode;
        this.mapForCustomMode = map;
    }

    public clearCustomMode() {
        this.currentCustomMode = null;
        this.mapForCustomMode = null;
        this.underlyingMode = null;
    }

    public isPlayingCustomMode(): boolean {
        return this.currentCustomMode !== null;
    }

    public getCustomMode(): { map: number | null, customMode: number | null, underlyingMode: number | null } {
        return {map: this.mapForCustomMode, customMode: this.currentCustomMode, underlyingMode: this.underlyingMode};
    }

}