import './styles/overlay.css';
import './styles/components.css';

import { formatPbTime } from './util/time-formating';
import {PbRunInfoAndSoB, SplitInfo} from "../types/global";
import {Stopwatch} from "./util/stopwatch";
import {Split} from "../types/mode-splits";
import { Settings } from '../types/settings';

const animationDuration = 100;

const map3Routes: { [key: number]: string[] } = {
    0: [
        "Bridge",
        "Anvil Skip",
        "Strawberries",
        "Pirate Ship",
        "Pelican",
        "Bob's Corner",
        "Roots",
        "Rings Left",
    ],

    1: [
        "Bridge",
        "Turtles Skip",
        "Water",
        "Caterpillars",
        "Columns",
        "Main Hall",
        "Roots", // Maybe? this seems always to be Route A
        "Rings Mid",
    ],

    2: [
        "Bridge",
        "Turtles",
        "Eggplants",
        "Moais",
        "Pears",
        "Main Hall",
        "Roots",
        "Rings Right",
    ],

};

async function loadMapMode(pbRunInfo: PbRunInfoAndSoB) {
    const {splits, pb, sumOfBest, pace, settings, isUDMode, playAnimation} = pbRunInfo;
    __electronLog.debug(`loading map and mode with animation: ${playAnimation}`);
    setLootDisplay("")
    // Clear splits
    const splitsDiv = document.getElementById('splits');
    if (!splitsDiv) return;
    splitsDiv.innerHTML = '';
    if (playAnimation) {
        await playAnimations(
            {animation: hideAnimation, id: 'status-msg'},
            {animation: (splitDiv: HTMLElement) => hideSplits(splitDiv, pbRunInfo), element: splitsDiv},
            {animation: hideAnimation, id: 'totals'},
        )
    } else {
        hide('status-msg')
        hide('splits')
        hide('totals')
    }
    const reverseUDSplits = settings.reverseUDModes;
    if (reverseUDSplits && isUDMode) reverseSplitList(splits)

    splits.forEach((split: SplitInfo) => {
        appendSplit(split, splitsDiv, settings.showResetCounters === undefined ? true : settings.showResetCounters, playAnimation);
    });
    // Sum of Best und PB setzen
    await resetStats(pb, sumOfBest, pace, pbRunInfo.settings.showSoB, pbRunInfo.settings.showPace, playAnimation);
    if (playAnimation) {
        show('splits')
        await playAnimations(
            {animation: (splitDiv: HTMLElement) => showSplits(splitDiv, pbRunInfo), element: splitsDiv},
            {animation: showAnimation, id: 'totals'},
        )
    } else {
        show('splits')
        show('totals')
    }
    await toggleCustomModeDisplay(pbRunInfo.customModeName, playAnimation)

    __electronLog.debug(`finished loading map and mode animate: ${playAnimation}`);
}

function reverseSplitList(splits: any[]) {
    splits.reverse();
    const pbSplit = splits.shift()!
    splits.push(pbSplit)
}

function appendSplit(split: SplitInfo, splitsDiv: HTMLElement, showResets: boolean, animate: boolean) {
    const skippedClass = split.skipped ? 'skipped' : null;
    const splitDiv = document.createElement('div');
    splitDiv.className = 'split';
    splitDiv.classList.add('animate-hidden')
    if (animate) {
        splitDiv.classList.add('hidden')
    }
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
    if (split.hide) hideElement(splitDiv)

    splitsDiv.appendChild(splitDiv);
}

async function toggleCustomModeDisplay(customModeName: string | undefined, animate: boolean) {
    const customModeNameSpan = document.getElementById('custom-mode-name')!;
    if (customModeName) {
        customModeNameSpan.innerText = customModeName;
        await showByIdWithAnimationFlag('custom-mode-display', animate);
    } else {
        await hideByIdWithAnimationFlag('custom-mode-display', true)
        customModeNameSpan.innerText = '';
    }
}

function addSplitTimeAndDiff(splitKey: number, splitTime: number, diff: number, golden: boolean, goldPace: boolean, onlyDiffColored: boolean, map3Route: number | undefined) {
    __electronLog.info(`Adding split time for split ${splitKey}: ${splitTime}, diff: ${diff}, golden: ${golden} goldPace: ${goldPace} map3Route: ${map3Route}`);
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

        if (map3Route !== undefined) {
            const splitNameSpan = splitDiv.querySelector(".split-name") as HTMLElement | null;
            if (splitNameSpan) {
                splitNameSpan.innerText = map3Routes[map3Route][splitKey];
            }
        }
    }
}

const awaitingResets: PbRunInfoAndSoB[] = [];
let isProcessingResets = false;

window.electronAPI.resetOverlay(async (_event: Electron.IpcRendererEvent,
                                       pbRunInfo: PbRunInfoAndSoB) => {
    addToResetOverlayQueue(pbRunInfo)
});

async function processResetQueue() {
    if (isProcessingResets) return;
    isProcessingResets = true;
    while (awaitingResets.length > 0) {
        const nextItem = awaitingResets.shift()!;
        __electronLog.debug(`[Queue] processing next item. queue length now: ${awaitingResets.length}`);
        try {
            await loadMapMode(nextItem);
            __electronLog.debug(`[Queue] finished loadingMapMode`);
        } catch (err) {
            __electronLog.error(`[Queue] error while loadingMapMode: ${err}`);
        }
    }
    isProcessingResets = false;
    __electronLog.debug("[Queue] done");
}

function addToResetOverlayQueue(pbRunInfo: PbRunInfoAndSoB, next: boolean = false) {
    if (!next) {
        awaitingResets.push(pbRunInfo);
        __electronLog.debug(`[Queue] adding to request queue. queue length now: ${awaitingResets.length}`)
    } else {
        // ensure the provided item is processed next
        awaitingResets.unshift(pbRunInfo);
    }
    void processResetQueue();
}

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

window.electronAPI.redrawOverlay(async (_event: Electron.IpcRendererEvent,
                                  pbRunInfoAndSoB: PbRunInfoAndSoB, reverseSplits: boolean) => {
    __electronLog.info(`Frontend: Redrawing overlay with PB: ${pbRunInfoAndSoB.pb}, sum of best: ${pbRunInfoAndSoB.sumOfBest}`);
    await resetStats(pbRunInfoAndSoB.pb, pbRunInfoAndSoB.sumOfBest, pbRunInfoAndSoB.pace, pbRunInfoAndSoB.settings.showSoB, pbRunInfoAndSoB.settings.showPace, false);

    const splitsDiv = document.getElementById('splits')!;
    const currentSplits: HTMLElement[] =  Array.from(splitsDiv.querySelectorAll('.split'));
    if (reverseSplits) {
        reverseSplitList(currentSplits);
        splitsDiv.innerHTML = '';
        currentSplits.forEach(split => splitsDiv.appendChild(split))
    }
    for (const splitDiv of currentSplits) {
        const frontendSettings = pbRunInfoAndSoB.settings
        const splitInfoForEl = pbRunInfoAndSoB.splits.find(splitInfo => splitInfo.split === splitDiv.id)!;
        if (splitInfoForEl.hide) hideElement(splitDiv)
        else showElement(splitDiv)

        const splitTime: HTMLElement = splitDiv.querySelector('.split-time')!;
        const splitName: HTMLElement = splitDiv.querySelector('.split-name')!;
        const splitDiff: HTMLElement = splitDiv.querySelector('.split-diff')!;

        if (pbRunInfoAndSoB.map !== 9) { // #9 is map3, dont redraw the split names, because they are route dependent
            splitName.innerText = splitInfoForEl.name
        }

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
    }
    await toggleCustomModeDisplay(pbRunInfoAndSoB.customModeName, false)
});


async function resetStats(pb: number, sumOfBest: number, pace: number, showSoB: boolean, showPace: boolean, animate: boolean) {
    const totalsDiv =  document.getElementById('totals')!;

    const sumOfBestSpan = document.getElementById('sum-of-best')!;
    sumOfBestSpan.textContent = sumOfBest > 0 ? formatPbTime(sumOfBest) : '?'

    const paceSpan = document.getElementById('pace')!;
    paceSpan.textContent = pace > 0 ? formatPbTime(pace) : '?';

    if (!showPace) {
        await hideAnimation(paceSpan.parentElement!)
    } else {
        await showElementWithAnimationFlag(paceSpan.parentElement!, animate)
    }
    if (!showSoB) {
        await hideAnimation(sumOfBestSpan.parentElement!)
    } else {
        await showElementWithAnimationFlag(sumOfBestSpan.parentElement!, animate)
    }

    if(!showSoB || !showPace) {
        totalsDiv.classList?.add("two-children")
    } else {
        totalsDiv.classList?.remove("two-children")
    }

    if (showPace && !showSoB) {
        paceSpan.parentElement!.style.gridColumn = "2";
    } else {
        paceSpan.parentElement!.style.gridColumn = ""
    }
}
window.electronAPI.mainMenuOpened(async () => {
    const splitsDiv = document.getElementById('splits');
    if (splitsDiv) {
        await hideSplits(splitsDiv)
        splitsDiv.innerHTML = '';
    }
    await setLootDisplay("")
    await hideAnimation(document.getElementById('totals')!)
    const sumOfBestSpan = document.getElementById('sum-of-best')!;
    sumOfBestSpan.textContent = '';

    const paceSpan = document.getElementById('pace')!;
    paceSpan.textContent = '';

    await hideAnimation(document.getElementById('custom-mode-display')!);
    await showAnimation(document.getElementById('status-msg')!)
});

window.electronAPI.onSplitPassed((_event: Electron.IpcRendererEvent, splitInfo) => {
    addSplitTimeAndDiff(splitInfo.splitIndex, splitInfo.splitTime, splitInfo.splitDiff, splitInfo.golden, splitInfo.goldPace, splitInfo.onlyDiffColored, splitInfo.map3Route);
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

window.electronAPI.changeGoldSplitColor((_event: Electron.IpcRendererEvent, goldSplitColor: string) => {
    document.documentElement.style.setProperty('--golden-split-col', goldSplitColor)
})

window.electronAPI.changeGoldPaceColor((_event: Electron.IpcRendererEvent, goldPaceColor: string) => {
    document.documentElement.style.setProperty('--golden-pace-col', goldPaceColor)
})

window.electronAPI.changeFastSplitColor((_event: Electron.IpcRendererEvent, fastSplitColor: string) => {
    document.documentElement.style.setProperty('--early-col', fastSplitColor)
})

window.electronAPI.changeSlowSplitColor((_event: Electron.IpcRendererEvent, slowSplitColor: string) => {
    document.documentElement.style.setProperty('--late-col', slowSplitColor)
})



window.electronAPI.lootStarted(async (_event: Electron.IpcRendererEvent, seed: string, isSpeedrun: boolean) => await setLootDisplay(seed, isSpeedrun))

let stopwatch: Stopwatch | null = null;

async function setLootDisplay(seed: string, isSpeedrun: boolean = false) {
    const lootDisplayDiv = document.getElementById('loot-display')!
    const lootSeedDiv = document.getElementById('loot-seed')!
    const lootTimerDiv = document.getElementById('loot-timer')!
    __electronLog.debug(`setting loot display: '${seed}', isSpeedrun: ${isSpeedrun}`);
    if (seed === "") {
        stopwatch?.reset()
        return hideAnimation(lootDisplayDiv)
    }
    await hideAnimation(document.getElementById('status-msg')!)
    if (isSpeedrun) {
        await showAnimation(lootTimerDiv)
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
        hideElement(lootTimerDiv);
    }
    lootSeedDiv.innerText = "Seed: " + seed;
    await showAnimation(lootDisplayDiv)
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

async function playAnimations(...animations: { animation: (element: HTMLElement) => Promise<void>; id?: string; element?: HTMLElement }[]) {
    if (animations.length === 0) {
        await new Promise<void>((resolve) => setTimeout(() => resolve(), animationDuration));
        return;
    }
    const first = animations.shift()!;
    if (!first.id && !first.element) {
        throw new Error('Invalid animation, either id or element must be provided');
    }
    const element = first.element || document.getElementById(first.id!)
    if (!element) {
        __electronLog.error(`could not find element by id: '${first.id}' when animating`)
        __electronLog.error(`children of splitdiv: ${Array.from(document.getElementById("splits")!.children)}`)
        await playAnimations(...animations); // just play the rest of the animations regardless of this error.
        return;
    }

    // recursively play rest of animations
    await first.animation(element)
    await playAnimations(...animations);
}

function hideElement(element: HTMLElement) {
    element.style.display = "none";
}

function hide(id: string) {
    const element = document.getElementById(id);
    if (!element) {
        __electronLog.error(`when hiding couldn't find element with id ${id}`)
        return;
    }
    hideElement(element)
}

function showElement(element: HTMLElement) {
    element.style.display = "";
}

function show(id: string) {
    const element = document.getElementById(id);
    if (!element) {
        __electronLog.error(`when hiding couldn't find element with id ${id}`)
        return;
    }
    showElement(element)
}

async function hideByIdWithAnimationFlag(id: string, animate: boolean) {
    const element = document.getElementById(id);
    if (!element) {
        __electronLog.error(`when hiding couldn't find element with id ${id}`)
        return;
    }
    await hideElementWithAnimationFlag(element, animate);
}

async function showByIdWithAnimationFlag(id: string, animate: boolean) {
    const element = document.getElementById(id)
    if (!element) {
        __electronLog.error(`when hiding couldn't find element with id ${id}`)
        return;
    }
    await showElementWithAnimationFlag(element, animate)
}

async function showElementWithAnimationFlag(element: HTMLElement, animate: boolean) {
    if (animate) await showAnimation(element)
    else showElement(element);
}

async function hideElementWithAnimationFlag(element: HTMLElement, animate: boolean) {
    if (animate) await hideAnimation(element)
    else hideElement(element);
}


async function hideAnimation(element: HTMLElement) {
    if (element.style.display === "none") return;
    element.classList.add("hidden")
    return new Promise<void>(function (resolve, reject) {
        setTimeout(() => {
            element.classList.remove("hidden")
            element.style.display = "none";
            requestAnimationFrame(() => {
                resolve()
            })
        }, animationDuration)
    })
}

async function showAnimation(element: HTMLElement) {
    element.style.display = "";
    element.classList.add("hidden")

    return new Promise<void>(function (resolve, reject) {
        setTimeout(() => {
            element.classList.remove("hidden")
            requestAnimationFrame(() => resolve())
        }, animationDuration/4)
    })
}

async function showSplits(splitsDiv: HTMLElement, pbRunInfo: PbRunInfoAndSoB) {
    const splits = Array.from(splitsDiv.children) as Array<HTMLElement>;
    splitsDiv.style.display = "";
    const animations = splits
        .filter((splitEl) => {
            const splitInfo = pbRunInfo.splits.find((s) => s.split === splitEl.id);
            if (!splitInfo) throw new Error(`Invalid split element with id ${splitEl.id}, no corresponding split info found, splits: ${JSON.stringify(pbRunInfo.splits)}`);
            return !splitInfo.skipped || (!splitInfo.hide)
        })
        .map((split) => ({animation: showAnimation, element: split}))
    return new Promise<void>((resolve) => requestAnimationFrame(async () => {
        await playAnimations(...animations);
        resolve()
    }))
}

async function hideSplits(splitsDiv: HTMLElement, pbRunInfo?: PbRunInfoAndSoB) {
    const splits = Array.from(splitsDiv.children) as Array<HTMLElement>;
    const animations = splits
        .filter((splitEl) => {
            if (!pbRunInfo) return true;
            const splitInfo = pbRunInfo.splits.find((s) => s.split === splitEl.id);
            if (!splitInfo) throw new Error(`Invalid split element with id ${splitEl.id}, no corresponding split info found, splits: ${JSON.stringify(pbRunInfo.splits)}`);
            return !splitInfo.skipped || (!splitInfo.hide)
        })
        .map((split) => ({animation: hideAnimation, id: split.id}))
    await playAnimations(...animations);
    splitsDiv.style.display = "none";
}