function loadMapMode(map: string, mode: string, splits: {key:number, splitName: string, splitTime: string, resetCount: number}[]) {
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
            splitDiv.id = split.key.toString();

            const nameSpan = document.createElement('span');
            nameSpan.className = 'split-name';
            nameSpan.textContent = split.splitName;
            splitDiv.appendChild(nameSpan);

            const resetsSpan = document.createElement('span');
            resetsSpan.className = 'split-resets';
            resetsSpan.textContent = `${split.resetCount}`;
            splitDiv.appendChild(resetsSpan);

            const diffSpan = document.createElement('span');
            diffSpan.className = 'split-diff';
            // Empty diff
            splitDiv.appendChild(diffSpan);

            const timeSpan = document.createElement('span');
            timeSpan.className = 'split-time';
            timeSpan.textContent = split.splitTime
            splitDiv.appendChild(timeSpan);

            splitsDiv.appendChild(splitDiv);
        });
    }
}

function addSplitTimeAndDiff(splitKey: number, splitTime: number, diff: number, golden: boolean) {
    const splitDiv = document.getElementById(splitKey.toString());
    if (splitDiv) {
        const timeSpan = splitDiv.querySelector('.split-time');
        if (timeSpan) timeSpan.textContent = formatTime(splitTime);

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
            numSpan.textContent = formatTime(absDiff);
            diffSpan.appendChild(numSpan);
            // Typenklasse setzen
            const type = golden ? "golden" : diff < 0 ? "early" : diff > 0 ? "late" : "";
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
                                       mapAndMode:{ map: string; mode: string; splits: { name: string; split: number; time: number }[] }) => {
    loadMapMode(
        mapAndMode.map,
        mapAndMode.mode,
        mapAndMode.splits.map((split, index) => ({
            key: index,
            splitName: split.name,
            splitTime: formatTime(split.time),
            resetCount: 0
        }))
    );
});

window.electronAPI.onSplitPassed((event: Electron.IpcRendererEvent, splitInfo: {splitIndex: number, splitTime: number, splitDiff: number, golden: boolean}) => {
    addSplitTimeAndDiff(splitInfo.splitIndex, splitInfo.splitTime, splitInfo.splitDiff, splitInfo.golden);
});

function formatTime(seconds: number): string {
    const sign = seconds < 0 ? '-' : '';
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = Math.floor(absSeconds % 60);
    const ms = Math.round((absSeconds - Math.floor(absSeconds)) * 1000);

    const minsStr = mins.toString().padStart(2, '0');
    const secsStr = secs.toString().padStart(2, '0');
    const msStr = ms.toString().padStart(3, '0');

    return `${sign}${minsStr}:${secsStr}.${msStr}`;
}
