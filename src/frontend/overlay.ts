import './styles/overlay.css';
import './styles/components.css';

import { formatPbTime } from './util/time-formating';
import {PbRunInfoAndSoB, SplitInfo} from "../types/global";
import {Stopwatch} from "./util/stopwatch";

function loadMapMode(pbRunInfo: PbRunInfoAndSoB) {
    const { splits, pb, sumOfBest, pace, settings, isUDMode } = pbRunInfo;

    setLootDisplay("")
    // Clear splits
    const splitsDiv = document.getElementById('splits');
    if (splitsDiv) {
        splitsDiv.innerHTML = '';
        const reverseUDSplits = settings.reverseUDModes;
        if (reverseUDSplits && isUDMode) {
            splits.reverse();
        }
        splits.forEach((split: SplitInfo) => {
            appendSplit(split, splitsDiv, settings.showResetCounters === undefined ? true : settings.showResetCounters);
        });
    }
    // Sum of Best und PB setzen
    resetStats(pb, sumOfBest, pace, pbRunInfo.settings.showSoB, pbRunInfo.settings.showPace);
    toggleCustomModeDisplay(pbRunInfo.customModeName)

    document.getElementById('totals')!.style!.display = 'grid';
    document.getElementById('status-msg')!.style!.display = 'none';
}

function appendSplit(split: SplitInfo, splitsDiv: HTMLElement, showResets: boolean) {
    const skippedClass = split.skipped ? 'skipped' : null;
    const splitDiv = document.createElement('div');
    splitDiv.className = 'split';
    splitDiv.id = split.split.toString();

    const nameSpan = document.createElement('span');

    nameSpan.classList.add('split-name');
    if (skippedClass) nameSpan.classList.add(skippedClass);

    nameSpan.textContent = split.name;
    splitDiv.appendChild(nameSpan);
    const resetsSpan = document.createElement('span');
    resetsSpan.classList.add('split-resets');
    if (skippedClass) resetsSpan.classList.add(skippedClass);
    if (showResets) {
        resetsSpan.textContent = `${split.resets}`;
        resetsSpan.classList.remove('hidden')
    }
    else {
        resetsSpan.textContent = "";
        resetsSpan.classList.add('hidden')
    }
    splitDiv.appendChild(resetsSpan);

    const diffSpan = document.createElement('span');
    diffSpan.classList.add('split-diff');
    // Empty diff
    splitDiv.appendChild(diffSpan);

    const timeSpan = document.createElement('span');
    // timeSpan.className = 'split-time ' + skippedClass;
    timeSpan.classList.add('split-time');
    if (skippedClass) timeSpan.classList.add(skippedClass);
    timeSpan.textContent = formatPbTime(split.time)
    splitDiv.appendChild(timeSpan);
    if (split.hide) splitDiv.style.display = 'none';

    splitsDiv.appendChild(splitDiv);
}

function toggleCustomModeDisplay(customModeName?: string) {
    const customModeDisplay = document.getElementById('custom-mode-display');
    const customModeNameSpan = document.getElementById('custom-mode-name')!;
    if (customModeName) {
        customModeNameSpan.innerText = customModeName;
        customModeDisplay!.style.display = 'inline';
    } else {
        customModeDisplay!.style.display = 'none';
        customModeNameSpan.innerText = '';
    }
}

function addSplitTimeAndDiff(splitKey: number, splitTime: number, diff: number, golden: boolean, goldPace: boolean, onlyDiffColored: boolean) {
    __electronLog.info(`Adding split time for split ${splitKey}: ${splitTime}, diff: ${diff}, golden: ${golden} goldPace: ${goldPace}`);
    const splitDiv = document.getElementById(splitKey.toString());
    if (splitDiv) {
        if (goldPace) {
            const nameSpan = splitDiv.querySelector('.split-name')!;
            nameSpan.classList.add("gold-pace");
        }
        const type =  golden ? "golden" : diff > 0 ? "late" : diff < 0 ? "early" : "";
        const timeSpan = splitDiv.querySelector('.split-time');
        if (timeSpan) {
            timeSpan.textContent = formatPbTime(splitTime);
            timeSpan.className = "split-time";
            if (!onlyDiffColored) {
                timeSpan.className += " " + type;
            }
        }

        const diffSpan = splitDiv.querySelector('.split-diff');
        if (diffSpan) {
            diffSpan.innerHTML = '';
            let sign = '';
            if (diff > 0) sign = '+';
            else if (diff < 0) sign = '-';
            const absDiff = Math.abs(diff);
            const signSpan = document.createElement('span');
            signSpan.className = 'sign';
            signSpan.textContent = sign;
            diffSpan.appendChild(signSpan);
            const numSpan = document.createElement('span');
            numSpan.className = 'num';
            __electronLog.info(`Adding split diff: ${absDiff} (golden: ${golden})`);
            numSpan.textContent = formatPbTime(absDiff, true);
            diffSpan.appendChild(numSpan);
            diffSpan.className = 'split-diff' + (type ? ' ' + type : '');
        }
    }
}

window.electronAPI.resetOverlay((_event: Electron.IpcRendererEvent,
                                       pbRunInfo: PbRunInfoAndSoB) => {
    loadMapMode(pbRunInfo);
});

window.electronAPI.clickThroughChanged((_event: Electron.IpcRendererEvent, notClickThrough: boolean) => {
    const body = document.querySelector("body")!
    if (notClickThrough) {
        body.style.border = "1px solid transparent"
        body.style.borderRadius = "6px"
    } else {
        body.style.border = "1px solid white"
        body.style.borderRadius = "6px"
    }
})

window.electronAPI.redrawOverlay((_event: Electron.IpcRendererEvent,
                                  pbRunInfoAndSoB: PbRunInfoAndSoB) => {
    __electronLog.info(`Frontend: Redrawing overlay with PB: ${pbRunInfoAndSoB.pb}, sum of best: ${pbRunInfoAndSoB.sumOfBest}`);
    resetStats(pbRunInfoAndSoB.pb, pbRunInfoAndSoB.sumOfBest, pbRunInfoAndSoB.pace, pbRunInfoAndSoB.settings.showSoB, pbRunInfoAndSoB.settings.showPace);

    const splitsDiv = document.getElementById('splits')!;
    const currentSplits:NodeListOf<HTMLElement> = splitsDiv.querySelectorAll('.split');
    currentSplits.forEach(splitDiv => {
        const frontendSettings = pbRunInfoAndSoB.settings
        const splitInfoForEl = pbRunInfoAndSoB.splits.find(splitInfo => splitInfo.split === parseInt(splitDiv.id))!;
        if (splitInfoForEl.hide)
            splitDiv.style.display = 'none';
        else
            splitDiv.style.display = 'grid';

        const splitTime: HTMLElement = splitDiv.querySelector('.split-time')!;
        const splitName: HTMLElement = splitDiv.querySelector('.split-name')!;
        const splitDiff: HTMLElement = splitDiv.querySelector('.split-diff')!;

        splitName.innerText = splitInfoForEl.name

        const potentialClassesFromDiff = splitDiff.className.match(/(early|late|golden)/g);
        splitTime.classList.remove("early", "late", "golden");
        // if you want to not only color the diffs, then make sure the splitTime has the color class
        if (potentialClassesFromDiff && potentialClassesFromDiff.length > 0 && !pbRunInfoAndSoB.settings.onlyDiffsColored) {
            const classToAdd = potentialClassesFromDiff[0];
            if (!splitTime.classList.contains(classToAdd)) {
                splitTime.classList.add(classToAdd);
            }
        }

        let resetSpan: HTMLSpanElement | null = splitDiv.querySelector('.split-resets');
        if (!resetSpan) {
            resetSpan = document.createElement('span');
            resetSpan.className = 'split-resets';
            splitDiv.appendChild(resetSpan);
        }
        if (frontendSettings.showResetCounters) {
            resetSpan.textContent = `${splitInfoForEl.resets}`;
            resetSpan.classList.remove('hidden')
        } else {
            resetSpan.textContent = '';
            resetSpan.classList.add('hidden')
        }

        if (splitInfoForEl.skipped) {
            splitDiv.classList.add("skipped");
            splitTime.classList.add('skipped');
            splitName.classList.add('skipped');
            resetSpan.classList.add('skipped');
            if (pbRunInfoAndSoB.settings.raceGoldSplits) splitTime.textContent = formatPbTime(0)
        } else {
            splitDiv.classList.remove("skipped");
            splitTime.classList.remove('skipped');
            splitName.classList.remove('skipped');
            resetSpan.classList.remove('skipped');
            if (pbRunInfoAndSoB.settings.raceGoldSplits)  splitTime.textContent = formatPbTime(splitInfoForEl.time);
        }

        toggleCustomModeDisplay(pbRunInfoAndSoB.customModeName)
    })
});


function resetStats(pb: number, sumOfBest: number, pace: number, showSoB: boolean, showPace: boolean) {
    const sumOfBestSpan = document.getElementById('sum-of-best')!;
    sumOfBestSpan.textContent = sumOfBest > 0 ? formatPbTime(sumOfBest) : '?'

    const pbTimeSpan = document.getElementById('pb-time')!;
    pbTimeSpan.textContent = pb > 0 ? formatPbTime(pb) : '?';

    const paceSpan = document.getElementById('pace')!;
    paceSpan.textContent = pace > 0 ? formatPbTime(pace) : '?';

    if (!showPace) {
        paceSpan.parentElement!.style.display = 'none';
    } else {
        paceSpan.parentElement!.style.display = '';
    }
    if (!showSoB) {
        sumOfBestSpan.parentElement!.style.display = 'none';
    } else {
        sumOfBestSpan.parentElement!.style.display = '';
    }

    if (showPace && !showSoB) {
        paceSpan.parentElement!.style.gridColumn = "2";
    } else {
        paceSpan.parentElement!.style.gridColumn = ""
    }
}
window.electronAPI.mainMenuOpened(() => {
    const splitsDiv = document.getElementById('splits');
    if (splitsDiv) {
        splitsDiv.innerHTML = '';
    }
    setLootDisplay("")
    const sumOfBestSpan = document.getElementById('sum-of-best');
    if (sumOfBestSpan) {
        sumOfBestSpan.textContent = '';
    }
    const pbTimeSpan = document.getElementById('pb-time');
    if (pbTimeSpan) {
        pbTimeSpan.textContent = '';
    }
    const paceSpan = document.getElementById('pace');
    if (paceSpan) {
        paceSpan.textContent = '';
    }
    document.getElementById('totals')!.style!.display = 'None';
    document.getElementById('custom-mode-display')!.style!.display = 'None';

    document.getElementById('status-msg')!.style!.display = '';
});

window.electronAPI.onSplitPassed((_event: Electron.IpcRendererEvent, splitInfo) => {
    addSplitTimeAndDiff(splitInfo.splitIndex, splitInfo.splitTime, splitInfo.splitDiff, splitInfo.golden, splitInfo.goldPace, splitInfo.onlyDiffColored);
});

window.electronAPI.onGoldenSplitPassed((_event: Electron.IpcRendererEvent, sumOfBest: number) => {
    const sumOfBestSpan = document.getElementById('sum-of-best');
    if (sumOfBestSpan) {
        sumOfBestSpan.textContent = sumOfBest > 0 ? formatPbTime(sumOfBest) : '?'
    }
});

window.electronAPI.onLastSplitGolden(() => {
// Maybe sth? currently empty
});

window.electronAPI.onStatusChanged((_event: Electron.IpcRendererEvent, status: { pogoPathValid: boolean; steamPathValid: boolean; friendCodeValid: boolean; showLogDetectMessage: boolean; logsDetected: boolean }) => {
    __electronLog.info(`[Frontend|Overlay] Status changed: pogoPathValid: ${status.pogoPathValid}, steamPathValid: ${status.steamPathValid}, friendCodeValid: ${status.friendCodeValid}, showLogDetectMessage: ${status.showLogDetectMessage}, logsDetected: ${status.logsDetected}`);
    const statusElement = document.getElementById('status-msg')!;
    statusElement.innerHTML = '';
    const { pogoPathValid, steamPathValid, friendCodeValid, logsDetected, showLogDetectMessage } = status;
    const statusMsg = createStatusMessage(pogoPathValid, steamPathValid, friendCodeValid, logsDetected, showLogDetectMessage)
    statusMsg.split('\n').forEach(line => {
        const div = document.createElement('div');
        div.textContent = line;
        statusElement.appendChild(div);
    });
    if (!(pogoPathValid && steamPathValid && friendCodeValid && logsDetected)) {
        setLootDisplay("")
    }
})


window.electronAPI.changeBackground((_event: Electron.IpcRendererEvent, enableBackgroundColor: string | null) => {
    const body = document.body;
    if (enableBackgroundColor) {
        body.style.backgroundColor = enableBackgroundColor;
    } else {
        body.style.backgroundColor = '';
    }
})

window.electronAPI.lootStarted((_event: Electron.IpcRendererEvent, seed: string, isSpeedrun: boolean) => setLootDisplay(seed, isSpeedrun))

let stopwatch: Stopwatch | null = null;

function setLootDisplay(seed: string, isSpeedrun: boolean = false) {
    const lootDisplayDiv = document.getElementById('loot-display')!
    const lootSeedDiv = document.getElementById('loot-seed')!
    const lootTimerDiv = document.getElementById('loot-timer')!
    __electronLog.debug(`setting loot display: '${seed}', isSpeedrun: ${isSpeedrun}`);
    if (seed === "") {
        stopwatch?.reset()
        lootDisplayDiv.style.display = 'none';
        lootTimerDiv.style.display = 'none';
        return;
    }
    if (isSpeedrun) {
        lootTimerDiv.style.display = '';
        if (!stopwatch) {
            stopwatch = new Stopwatch((elapsed) => {
                lootTimerDiv.innerText = formatPbTime(elapsed/1000, true);
            });
            stopwatch.start()
        } else {
            stopwatch.reset();
            stopwatch.start();
        }
    } else {
        lootTimerDiv.style.display = 'none';
    }
    document.getElementById('status-msg')!.style!.display = 'none';
    lootDisplayDiv.style.display = 'block';
    lootSeedDiv.innerText = "Seed: " + seed;
}

window.electronAPI.showMessage((_event: Electron.IpcRendererEvent, message: string) => {
    const overlayMessageContainer = document.getElementById("overlay-messages")
    if(!overlayMessageContainer) return;
    const messageDiv = document.createElement("div");
    messageDiv.className = "overlay-message";
    messageDiv.innerText = message;
    overlayMessageContainer.appendChild(messageDiv);
    __electronLog.debug(`Showing overlay message: '${message}'`);
    setTimeout(() => {
        messageDiv.remove();
    }, 6000)
})

function createStatusMessage(pogoPathValid: boolean, steamPathValid: boolean, friendCodeValid: boolean, logsDetected: boolean, showLogDetectMessage: boolean): string {
    let msg = "Config Status\n"
    if (pogoPathValid && steamPathValid && friendCodeValid && logsDetected) {
        return "Pogostuck-Splits - Active"
    }
    if (!pogoPathValid) {
        msg += `Pogostuck Steam Path: ❌\n`;
    } else {
        msg += `Pogostuck Steam Path: ✅\n`;
    }
    if (!steamPathValid) {
        msg += "Steam path: ❌\n";
    } else {
        msg += "Steam path: ✅\n";
    }

    if (!friendCodeValid) {
        msg += "Steam friend code: ❌\n";
    } else {
        msg += "Steam friend code: ✅\n";
    }
    if (showLogDetectMessage) {
        if (!logsDetected) {
            msg += "Logs detected (Check if you run Pogostuck with -diag): ❌\n";
        } else {
            msg += "Logs detected: ✅\n";
        }
    }
    return msg;
}