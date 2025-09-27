import {GoldSplitsTracker} from "./gold-splits-tracker";
import {PbSplitTracker} from "./pb-split-tracker";
import {SettingsManager} from "../settings-manager";
import {isUpsideDownMode} from "./valid-modes";
import log from "electron-log/main";
import {redrawSplitDisplay} from "../split-overlay-window";
import {BrowserWindow} from "electron";
import {GoldPaceTracker} from "./gold-pace-tracker";
import fs from "fs";
import {userDataPathEnd} from "./paths";
import path from "path";
import {BackupGoldSplitTracker} from "./backup-gold-split-tracker";
import {CustomModeHandler} from "./custom-mode-handler";
import {PogoNameMappings} from "./pogo-name-mappings";

export class CurrentStateTracker {
    private static instance: CurrentStateTracker | null = null;
    private mode: number = -1;
    private map: number = -1;
    private recordedSplits: { split: number, time: number }[] = [];
    private finalTime: number = -1; // not rly useful yet, but might be later just fits to put it here^^
    private currentlyRunning: boolean = false;

    private pogoPathValid: boolean = false;
    private steamPathValid: boolean = false;
    private steamFriendCodeValid: boolean = false;

    public static getInstance(): CurrentStateTracker {
        if (!CurrentStateTracker.instance) {
            CurrentStateTracker.instance = new CurrentStateTracker();
        }
        return CurrentStateTracker.instance;
    }

    public updateMapAndMode(map: number, mode: number, configWindow: BrowserWindow, forceCustomModeStop?: boolean): boolean {
        mode = this.checkForCustomMode(map, mode, configWindow, forceCustomModeStop)
        if (this.map !== map || this.mode !== mode) {
            this.map = map;
            this.mode = mode;
            this.recordedSplits = [];
            this.finalTime = -1;
            log.info(`Map changed to ${map}, mode changed to ${mode}`);
            return true;
        }
        return false;
    }

    /**
     * clears the custom mode if you changed from custom mode to sth else
     * returns the now active mode (if you're playing custom mode it returns that)
     */
    private checkForCustomMode(map: number, mode: number, configWindow: BrowserWindow, forceCustomModeStop: boolean | undefined): number {
        const customModeHandler = CustomModeHandler.getInstance()
        const isPlayingCustomMode = customModeHandler.isPlayingCustomMode()
        const customModeInfo = customModeHandler.getCustomMode()
        if ((isPlayingCustomMode && customModeInfo?.map !== map) || forceCustomModeStop) {
            customModeHandler.clearCustomMode(configWindow)
            return mode;
        }
        if (isPlayingCustomMode && customModeInfo!.underlyingMode === -1) { // when you press play with no mode known
            customModeHandler.setCustomMode(map, customModeInfo!.customMode!, mode, configWindow)
            customModeInfo!.underlyingMode = mode;
            console.log(`Setting underlying mode to ${mode} because it was -1`);
        }
        const newModeIsNotCustom = !isPlayingCustomMode || (customModeInfo!.underlyingMode !== mode) || (mode === -1 && customModeInfo!.underlyingMode !== -1)
        log.debug(`Checking for custom mode. Current mode: ${this.mode}, new mode: ${mode}, isPlayingCustomMode: ${isPlayingCustomMode}, customModeInfo: ${JSON.stringify(customModeInfo)}, newModeIsNotCustom: ${newModeIsNotCustom}`);
        if (newModeIsNotCustom) {
            customModeHandler.clearCustomMode(configWindow)
        }
        else {
            log.info(`Detected custom mode! ${JSON.stringify(customModeInfo)}`);
            return customModeInfo!.customMode
        }
        return mode;
    }

    public passedSplit(split: number, time: number, shouldSkip: boolean): {
        isGoldSplit: boolean,
        isGoldPace: boolean
    } {
        const settingsManager = SettingsManager.getInstance();
        const goldSplitsTracker = GoldSplitsTracker.getInstance();
        const goldPaceTracker = GoldPaceTracker.getInstance();
        const pbTracker = PbSplitTracker.getInstance();

        const lastSplit = this.getLastSplitTime();
        const from = lastSplit.split;
        log.info(`from: ${from}, split: ${split}, time: ${time}, lastSplit: ${lastSplit.split}, lastTime: ${lastSplit.time}`);
        const existingSplitIndex = this.recordedSplits.findIndex(s => s.split === split);
        if (existingSplitIndex !== -1) {
            const existingSplit = this.recordedSplits.splice(existingSplitIndex, 1)[0];
            this.recordedSplits.push({split: existingSplit.split, time: time});
        }
        const isUD = isUpsideDownMode(this.mode);
        if (lastSplit.split >= split && !isUD) {
            log.warn(`Tried to pass split ${split} but last split was ${lastSplit.split}. Ignoring.`);
            return {isGoldSplit: false, isGoldPace: false}
        }
        const splitTime = Math.round((time - (lastSplit ? lastSplit.time : 0)) * 1000) / 1000;
        this.recordedSplits.push({split, time: time});
        //  Check if the split you passed is on the path you specified (aka you're not coming from a split that is skipped)
        const splitPath = settingsManager.getSplitIndexPath(this.mode)
        const fromAndToAreInPlannedPath: boolean = splitPath.some((splitP) => from === splitP.from && splitP.to === split);
        let isGoldSplit = false;
        let goldSplit = goldSplitsTracker.getGoldSplitForModeAndSplit(this.mode, from, split)
        if ((!goldSplit || goldSplit && goldSplit > splitTime) && fromAndToAreInPlannedPath && !shouldSkip) {
            goldSplitsTracker.updateGoldSplit(this.mode, from, split, splitTime)
            log.info(`New gold split for mode ${this.mode} from ${from} to ${split} with time ${splitTime} gold split was ${goldSplit}`);
            isGoldSplit = true;
            log.debug(`attempting to backup old goldSplit: ${goldSplit}`);
            if (goldSplit) {
                const backupGoldTracker = BackupGoldSplitTracker.getInstance()
                backupGoldTracker.addBackup(goldSplit, {from, to: split}, this.mode)
            }
        } else {
            log.info(`No gold split for mode ${this.mode} from ${from} to ${split}, current gold split is ${goldSplit}`);
            log.info(`"goldSplit": ${goldSplit}, "splitTime": ${splitTime}, "goldSplitIsInSplitPath": ${fromAndToAreInPlannedPath}`);
        }

        let isGoldPace = false;
        const goldPace = goldPaceTracker.getGoldPaceForSplit(this.mode, split);
        if (!goldPace || goldPace.time > time || goldPace.time === 0) {
            goldPaceTracker.updateGoldPace(this.mode, split, time);
            log.info(`New gold pace for mode ${this.mode} at split ${split} with time ${time}, old was ${goldPace?.time}`);
            isGoldPace = true;
        } else {
            log.info(`No new gold pace for mode ${this.mode} at split ${split}, with time ${time}, current gold pace is ${goldPace?.time}`);
        }
        return {isGoldSplit, isGoldPace};
    }

    public finishedRun(time: number, igPbTime: number, configWindow: BrowserWindow, overlay: BrowserWindow): void {
        const goldSplitsTracker = GoldSplitsTracker.getInstance();
        const pbTracker = PbSplitTracker.getInstance();
        const customModeHandler = CustomModeHandler.getInstance()
        const pogoMappings = PogoNameMappings.getInstance()
        this.finalTime = time;
        let pb = goldSplitsTracker.getPbForMode(this.mode)
        log.info(`Run finished with time: ${time} registered ingame pb time: ${igPbTime} programmed pb time: ${pb}`);
        const lastSplit = this.recordedSplits[this.recordedSplits.length - 1]
        const lastDiff = time - lastSplit.time
        const lastGoldSplit = goldSplitsTracker.getLastGoldSplitForMode(this.mode)
        log.info(`Last split: ${lastSplit.split}, time: ${lastSplit.time}, last diff: ${lastDiff}`);
        log.info(`last gold split: from ${lastGoldSplit.from}, to ${lastGoldSplit.to}, time: ${lastGoldSplit.time}`);
        if (lastGoldSplit.time > lastDiff) {
            goldSplitsTracker.updateGoldSplit(this.mode, lastGoldSplit.from, lastGoldSplit.to, lastDiff);
            const backupGoldTracker = BackupGoldSplitTracker.getInstance()
            backupGoldTracker.addBackup(lastGoldSplit.time, {from: lastGoldSplit.from, to: lastGoldSplit.to}, this.mode)
            overlay.webContents.send("last-split-gold");
            log.info(`New best split for ${lastGoldSplit.from} to ${lastGoldSplit.to} with diff: ${lastDiff}`);
        }
        if (igPbTime < 0)
            igPbTime = Infinity

        const isCustom = customModeHandler.isCustomMode(this.map, this.mode);
        const pbTimeMismatch = pb !== igPbTime;
        const stateTracker = CurrentStateTracker.getInstance();

        if (pbTimeMismatch && !isCustom) { // kinda redundant, but reads better
            log.warn(`PB time mismatch: entered:vs actual: ${igPbTime}. This might have caused a faulty last Goldsplit. Not my fault tho:)`);
            pb = igPbTime;
        }
        if (this.finalTime < pb) {
            log.info(`New personal best: ${this.finalTime}`);
            pbTracker.setSplitsForMode(this.mode, this.recordedSplits);
            goldSplitsTracker.updatePbForMode(this.mode, this.finalTime)
            const isCustom = customModeHandler.isCustomMode(this.map, this.mode);
            if (isCustom) {
                const splitTimes: number[] = []
                for (let i = 0; i < pogoMappings.getMapModeAndSplits(this.map, this.mode).splits.length; i++) {
                    let split = this.recordedSplits.find(s => s.split === i);
                    if (!split)
                        split = {split: i, time: Infinity};

                    splitTimes.push(split.time);
                }
                customModeHandler.updateCustomModePbTimes(this.mode, splitTimes)
            }
            redrawSplitDisplay(stateTracker.getCurrentMap(), stateTracker.getCurrentMode(), overlay);
            configWindow.webContents.send('pb-improved', {mode: this.mode, pbTime: this.finalTime});
        } else if (pbTimeMismatch) { // if there was a mismatch and this run was not an actual pb still redraw the overlay
            goldSplitsTracker.updatePbForMode(this.mode, pb)
            redrawSplitDisplay(stateTracker.getCurrentMap(), stateTracker.getCurrentMode(), overlay);
            configWindow.webContents.send('pb-improved', {mode: this.mode, pbTime: pb})
        }
    }

    public resetRun() {
        this.recordedSplits = [];
        this.finalTime = -1;
        this.currentlyRunning = false;
    }

    public startingRun() {
        this.currentlyRunning = true;
        log.info(`Starting run for mode: ${this.mode}, map: ${this.map}`);
    }

    // Basically the same func as above but i just want to know when this happens
    public ensuresRunStarted() {
        if (!this.currentlyRunning) {
            this.currentlyRunning = true;
            log.info("Ensured run was started because a split or finish was detected while not running");
        }
    }

    public stoppingRun() {
        this.currentlyRunning = false;
    }

    public isCurrentlyRunning(): boolean {
        return this.currentlyRunning;
    }

    public getCurrentMap(): number {
        return this.map;
    }

    public getCurrentMode(): number {
        return this.mode;
    }

    public getLastSplitTime() {
        if (this.recordedSplits.length === 0) {
            if (isUpsideDownMode(this.mode)) {
                return {
                    split: PbSplitTracker.getInstance().getSplitAmountForMode(this.mode),
                    time: 0
                }
            }
            return {
                split: -1,
                time: 0
            }
        }
        return this.recordedSplits[this.recordedSplits.length - 1];
    }

    public updatePathsValidity() {
        const settingsManager = SettingsManager.getInstance();
        this.pogoPathValid = settingsManager.pogostuckSteamPath() !== '' && fs.existsSync(settingsManager.pogostuckSteamPath());
        this.steamPathValid = settingsManager.steamPath() !== '' && fs.existsSync(path.join(settingsManager.steamPath(), "userdata"));
        this.steamFriendCodeValid = fs.existsSync(path.join(settingsManager.steamPath(), "userdata", settingsManager.steamFriendCode(), ...userDataPathEnd));
        log.info(`Pogo path valid: ${this.pogoPathValid}, Steam path valid: ${this.steamPathValid} Steam friend code valid: ${this.steamFriendCodeValid}; For paths: ${settingsManager.pogostuckSteamPath()}, ${settingsManager.steamPath()} and code: ${settingsManager.steamFriendCode()}`);
    }

    public configPathsAreValid(): boolean {
        return this.pogoPathValid && this.steamPathValid && this.steamFriendCodeValid;
    }

    public pogoPathIsValid(): boolean {
        return this.pogoPathValid;
    }

    public steamPathIsValid(): boolean {
        return this.steamPathValid;
    }

    public steamFriendCodeIsValid(): boolean {
        return this.steamFriendCodeValid;
    }
}