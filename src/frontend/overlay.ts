import './overlay.css';
import './components.css';
import { formatPbTime } from './util/time-formating';
import {PbRunInfoAndSoB} from "../types/global";

function loadMapMode(mapAndModeChanged: PbRunInfoAndSoB) {
    const { splits, pb, sumOfBest } = mapAndModeChanged;

    // Clear splits
    const splitsDiv = document.getElementById('splits');
    if (splitsDiv) {
        splitsDiv.innerHTML = '';
        splits.forEach(split => {
            const skippedClass = split.skipped ? 'skipped' : '';
            const splitDiv = document.createElement('div');
            splitDiv.className = 'split';
            splitDiv.id = split.split.toString();

            const nameSpan = document.createElement('span');
            nameSpan.className = 'split-name ' + skippedClass;
            nameSpan.textContent = split.name;
            splitDiv.appendChild(nameSpan);

            // const resetsSpan = document.createElement('span');
            // resetsSpan.className = 'split-resets';
            // resetsSpan.textContent = `0`; // adjust with actual values
            // splitDiv.appendChild(resetsSpan);

            const diffSpan = document.createElement('span');
            diffSpan.className = 'split-diff';
            // Empty diff
            splitDiv.appendChild(diffSpan);

            const timeSpan = document.createElement('span');
            timeSpan.className = 'split-time ' + skippedClass;
            timeSpan.textContent = formatPbTime(split.time)
            splitDiv.appendChild(timeSpan);
            if (split.hide) splitDiv.style.display = 'none';

            splitsDiv.appendChild(splitDiv);
        });
    }
    // Sum of Best und PB setzen
    resetPbAndSumOfBest(pb, sumOfBest)
    __electronLog.debug(`mapAndModeChanged: ${JSON.stringify(mapAndModeChanged.customModeName)}`);
    toggleCustomModeDisplay(mapAndModeChanged.customModeName)

    document.getElementById('totals')!.style!.display = 'inline';
    document.getElementById('status-msg')!.style!.display = 'none';
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
                                       mapAndMode: PbRunInfoAndSoB) => {
    loadMapMode(mapAndMode);
});

window.electronAPI.redrawOverlay((_event: Electron.IpcRendererEvent,
                                  pbRunInfoAndSoB: PbRunInfoAndSoB) => {
    __electronLog.info(`Frontend: Redrawing overlay with PB: ${pbRunInfoAndSoB.pb}, sum of best: ${pbRunInfoAndSoB.sumOfBest}`);
    resetPbAndSumOfBest(pbRunInfoAndSoB.pb, pbRunInfoAndSoB.sumOfBest);

    const splitsDiv = document.getElementById('splits')!;
    const currentSplits:NodeListOf<HTMLElement> = splitsDiv.querySelectorAll('.split');
    currentSplits.forEach(splitDiv => {
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

        if (splitInfoForEl.skipped) {
            splitDiv.classList.add("skipped");
            splitTime.classList.add('skipped');
            splitName.classList.add('skipped');
            if (pbRunInfoAndSoB.settings.raceGoldSplits) splitTime.textContent = formatPbTime(0)
        } else {
            splitDiv.classList.remove("skipped");
            splitTime.classList.remove('skipped');
            splitName.classList.remove('skipped');
            if (pbRunInfoAndSoB.settings.raceGoldSplits)  splitTime.textContent = formatPbTime(splitInfoForEl.time);
        }
    })
});


function resetPbAndSumOfBest(pb: number, sumOfBest: number) {
    const sumOfBestSpan = document.getElementById('sum-of-best');
    if (sumOfBestSpan) {
        __electronLog.info(`Setting sum of best to ${sumOfBest}`);
        sumOfBestSpan.textContent = sumOfBest > 0 ? formatPbTime(sumOfBest) : '?'
    }
    const pbTimeSpan = document.getElementById('pb-time');
    if (pbTimeSpan) {
        pbTimeSpan.textContent = pb > 0 ? formatPbTime(pb) : '?';
        pbTimeSpan.classList.remove("golden")
    }
}
window.electronAPI.mainMenuOpened(() => {
    const splitsDiv = document.getElementById('splits');
    if (splitsDiv) {
        splitsDiv.innerHTML = '';
    }
    const sumOfBestSpan = document.getElementById('sum-of-best');
    if (sumOfBestSpan) {
        sumOfBestSpan.textContent = '';
    }
    const pbTimeSpan = document.getElementById('pb-time');
    if (pbTimeSpan) {
        pbTimeSpan.textContent = '';
    }
    document.getElementById('totals')!.style!.display = 'None';
    document.getElementById('custom-mode-display')!.style!.display = 'None';

    document.getElementById('status-msg')!.style!.display = 'inline';
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
    const pbSpan = document.getElementById('pb-time');
    if (pbSpan) {
        pbSpan.classList.add("golden")
    }
});

window.electronAPI.onStatusChanged((_event: Electron.IpcRendererEvent, status: { pogoPathValid: boolean; steamPathValid: boolean; friendCodeValid: boolean; showLogDetectMessage: boolean; logsDetected: boolean }) => {
    __electronLog.info(`[Frontend|Overlay] Status changed: pogoPathValid: ${status.pogoPathValid}, steamPathValid: ${status.steamPathValid}, friendCodeValid: ${status.friendCodeValid}, showLogDetectMessage: ${status.showLogDetectMessage}, logsDetected: ${status.logsDetected}`);
    const statusElement = document.getElementById('status-msg')!;
    statusElement.innerHTML = '';
    const statusMsg = createStatusMessage(status.pogoPathValid, status.steamPathValid, status.friendCodeValid, status.logsDetected, status.showLogDetectMessage)
    statusMsg.split('\n').forEach(line => {
        const div = document.createElement('div');
        div.textContent = line;
        statusElement.appendChild(div);
    });
})


window.electronAPI.changeBackground((_event: Electron.IpcRendererEvent, enableBackgroundColor: string | null) => {
    const body = document.body;
    if (enableBackgroundColor) {
        body.style.backgroundColor = enableBackgroundColor;
    } else {
        body.style.backgroundColor = '';
    }
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