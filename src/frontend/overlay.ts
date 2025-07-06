function loadMapMode(mapAndModeChanged: {
    map: string;
    mode: string;
    splits: { name: string; split: number; time: number }[],
    pb: number,
    sumOfBest: number
}) {
    const { map, mode, splits, pb, sumOfBest } = mapAndModeChanged;
    console.log(`Loading map: ${map}, mode: ${mode}, splits: ${JSON.stringify(splits)}, pb: ${pb}, sumOfBest: ${sumOfBest}`);
    // Set map and mode
    const mapName = document.getElementById('map-name');
    const modeName = document.getElementById('mode-name');
    if (mapName) mapName.textContent = map;
    if (modeName) modeName.textContent = mode;

    // Clear splits
    const splitsDiv = document.getElementById('splits');
    if (splitsDiv) {
        splitsDiv.innerHTML = '';
        splits.forEach(split => {
            const splitDiv = document.createElement('div');
            splitDiv.className = 'split';
            splitDiv.id = split.split.toString();

            const nameSpan = document.createElement('span');
            nameSpan.className = 'split-name';
            nameSpan.textContent = split.name;
            splitDiv.appendChild(nameSpan);

            const resetsSpan = document.createElement('span');
            resetsSpan.className = 'split-resets';
            resetsSpan.textContent = `0`; // TODO adjust with actual values
            splitDiv.appendChild(resetsSpan);

            const diffSpan = document.createElement('span');
            diffSpan.className = 'split-diff';
            // Empty diff
            splitDiv.appendChild(diffSpan);

            const timeSpan = document.createElement('span');
            timeSpan.className = 'split-time';
            timeSpan.textContent = formatTime(split.time)
            splitDiv.appendChild(timeSpan);

            splitsDiv.appendChild(splitDiv);
        });
    }
    // Sum of Best und PB setzen
    const sumOfBestSpan = document.getElementById('sum-of-best');
    if (sumOfBestSpan) sumOfBestSpan.textContent = formatTime(sumOfBest);
    const pbTimeSpan = document.getElementById('pb-time');
    if (pbTimeSpan) pbTimeSpan.textContent = formatTime(pb);
}

function addSplitTimeAndDiff(splitKey: number, splitTime: number, diff: number, golden: boolean) {
    console.log(`Adding split time for split ${splitKey}: ${splitTime}, diff: ${diff}, golden: ${golden}`);
    const splitDiv = document.getElementById(splitKey.toString());
    if (splitDiv) {
        const type =  golden ? "golden" : diff > 0 ? "late" : diff < 0 ? "early" : "";
        const timeSpan = splitDiv.querySelector('.split-time');
        if (timeSpan) {
            timeSpan.textContent = formatTime(splitTime);
            timeSpan.className = timeSpan.className + " " + type
        }

        const diffSpan = splitDiv.querySelector('.split-diff');
        if (diffSpan) {
            // Vorzeichen bestimmen
            let sign = '';
            if (diff > 0) sign = '+';
            else if (diff < 0) sign = '-';
            // Absoluten Wert für die Anzeige
            const absDiff = Math.abs(diff);
            // Alte Inhalte entfernen
            diffSpan.innerHTML = '';
            // <span class="sign"> und <span class="num"> erzeugen
            const signSpan = document.createElement('span');
            signSpan.className = 'sign';
            signSpan.textContent = sign;
            diffSpan.appendChild(signSpan);
            const numSpan = document.createElement('span');
            numSpan.className = 'num';
            console.log(`Adding split diff: ${absDiff} (golden: ${golden})`);
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

window.electronAPI.onMapOrModeChanged((event: Electron.IpcRendererEvent,
                                       mapAndMode: {
                                           map: string;
                                           mode: string;
                                           splits: { name: string; split: number; time: number }[],
                                           pb: number,
                                           sumOfBest: number
                                       }) => {
    loadMapMode(mapAndMode);
});

window.electronAPI.onSplitPassed((event: Electron.IpcRendererEvent, splitInfo: {splitIndex: number, splitTime: number, splitDiff: number, golden: boolean}) => {
    addSplitTimeAndDiff(splitInfo.splitIndex, splitInfo.splitTime, splitInfo.splitDiff, splitInfo.golden);
});

window.electronAPI.onGoldenSplitPassed((event: Electron.IpcRendererEvent, sumOfBest: number) => {
    const sumOfBestSpan = document.getElementById('sum-of-best');
    if (sumOfBestSpan) {
        sumOfBestSpan.textContent = formatTime(sumOfBest);
    }
});

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
