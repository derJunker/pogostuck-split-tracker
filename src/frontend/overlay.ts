import IpcRendererEvent = Electron.IpcRendererEvent;

function loadMapMode(mapAndModeChanged: {
    splits: { name: string; split: number; time: number; hide:boolean; skipped:boolean}[],
    pb: number,
    sumOfBest: number,
    settings: any,
}) {
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
            // resetsSpan.textContent = `0`; // TODO adjust with actual values
            // splitDiv.appendChild(resetsSpan);

            const diffSpan = document.createElement('span');
            diffSpan.className = 'split-diff';
            // Empty diff
            splitDiv.appendChild(diffSpan);

            const timeSpan = document.createElement('span');
            timeSpan.className = 'split-time ' + skippedClass;
            timeSpan.textContent = formatTime(split.time)
            splitDiv.appendChild(timeSpan);
            if (split.hide) splitDiv.style.display = 'none';

            splitsDiv.appendChild(splitDiv);
        });
    }
    // Sum of Best und PB setzen
    const sumOfBestSpan = document.getElementById('sum-of-best');
    if (sumOfBestSpan) {
        __electronLog.info(`Setting sum of best to ${sumOfBest}`);
        sumOfBestSpan.textContent = formatTime(sumOfBest);
    }
    const pbTimeSpan = document.getElementById('pb-time');
    if (pbTimeSpan) {
        pbTimeSpan.textContent = formatTime(pb);
    }
    document.getElementById('totals')!.style!.display = 'inline';
    document.getElementById('status-msg')!.style!.display = 'none';
}

function addSplitTimeAndDiff(splitKey: number, splitTime: number, diff: number, golden: boolean, onlyDiffColored: boolean) {
    __electronLog.info(`Adding split time for split ${splitKey}: ${splitTime}, diff: ${diff}, golden: ${golden}`);
    const splitDiv = document.getElementById(splitKey.toString());
    if (splitDiv) {
        const type =  golden ? "golden" : diff > 0 ? "late" : diff < 0 ? "early" : "";
        const timeSpan = splitDiv.querySelector('.split-time');
        if (timeSpan) {
            timeSpan.textContent = formatTime(splitTime);
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
            numSpan.textContent = formatTime(absDiff, true);
            diffSpan.appendChild(numSpan);
            diffSpan.className = 'split-diff' + (type ? ' ' + type : '');
        }
    }
}



// TODO add send logic from backend
function updateSplitResets(splitKey: number, newResetCount: number) {
    const splitDiv = document.getElementById(splitKey.toString());
    if (splitDiv) {
        const resetsSpan = splitDiv.querySelector('.split-resets');
        if (resetsSpan) {
            resetsSpan.textContent = newResetCount.toString();
        }
    }
}

window.electronAPI.resetOverlay((event: Electron.IpcRendererEvent,
                                       mapAndMode: {
                                           splits: { name: string; split: number; time: number; hide:boolean; skipped:boolean}[],
                                           pb: number,
                                           sumOfBest: number
                                           settings: any
                                       }) => {
    loadMapMode(mapAndMode);
});

window.electronAPI.redrawOverlay((event: Electron.IpcRendererEvent,
                                  pbRunInfoAndSoB: {
                                      splits: {
                                          name: string;
                                          split: number;
                                          time: number;
                                          hide: boolean;
                                          skipped: boolean
                                      }[],
                                      pb: number,
                                      sumOfBest: number,
                                      settings: any
                                       }) => {
    const sumOfBestSpan = document.getElementById('sum-of-best');
    if (sumOfBestSpan) {
        sumOfBestSpan.textContent = formatTime(pbRunInfoAndSoB.sumOfBest);
    }
    const pbTimeSpan = document.getElementById('pb-time');
    if (pbTimeSpan) {
        pbTimeSpan.textContent = formatTime(pbRunInfoAndSoB.pb);
    }

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
        __electronLog.debug(`splitTime classes before: ${splitTime.className}, potential classes: ${potentialClassesFromDiff}`);
        splitTime.classList.remove("early", "late", "golden");
        // if you want to not only color the diffs, then make sure the splitTime has the color class
        if (potentialClassesFromDiff && potentialClassesFromDiff.length > 0 && !pbRunInfoAndSoB.settings.onlyDiffsColored) {
            const classToAdd = potentialClassesFromDiff[0];
            __electronLog.debug(`Adding class ${classToAdd} to splitTime`);
            if (!splitTime.classList.contains(classToAdd)) {
                splitTime.classList.add(classToAdd);
            }
        }

        if (splitInfoForEl.skipped) {
            splitDiv.classList.add("skipped");
            splitTime.classList.add('skipped');
            splitName.classList.add('skipped');
        } else {
            splitDiv.classList.remove("skipped");
            splitTime.classList.remove('skipped');
            splitName.classList.remove('skipped');
        }
    })
});

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
    document.getElementById('status-msg')!.style!.display = 'inline';
});

window.electronAPI.onSplitPassed((event: Electron.IpcRendererEvent, splitInfo: {splitIndex: number, splitTime: number, splitDiff: number, golden: boolean, onlyDiffColored:boolean}) => {
    addSplitTimeAndDiff(splitInfo.splitIndex, splitInfo.splitTime, splitInfo.splitDiff, splitInfo.golden, splitInfo.onlyDiffColored);
});

window.electronAPI.onGoldenSplitPassed((event: Electron.IpcRendererEvent, sumOfBest: number) => {
    const sumOfBestSpan = document.getElementById('sum-of-best');
    if (sumOfBestSpan) {
        sumOfBestSpan.textContent = formatTime(sumOfBest);
    }
});

window.electronAPI.onStatusChanged((event: Electron.IpcRendererEvent, statusMsg: string) => {
    const statusElement = document.getElementById('status-msg')!;
    statusElement.innerHTML = '';
    statusMsg.split('\n').forEach(line => {
        const div = document.createElement('div');
        div.textContent = line;
        statusElement.appendChild(div);
    });
})

function formatTime(seconds: number, noZeroFill: boolean = false): string {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = Math.floor(absSeconds % 60);
    const ms = Math.round((absSeconds - Math.floor(absSeconds)) * 1000);

    const msStr = ms.toString().padStart(3, '0').slice(0, 3);

    if (noZeroFill) {
        if (mins > 0) {
            return `${mins}:${secs.toString().padStart(2, '0')}.${msStr}`;
        } else if (secs > 0) {
            return `${secs}.${msStr}`;
        } else {
            return `0.${msStr}`;
        }
    }

    const minsStr = mins.toString().padStart(2, '0');
    const secsStr = secs.toString().padStart(2, '0');

    return `${minsStr}:${secsStr}.${msStr}`;
}
