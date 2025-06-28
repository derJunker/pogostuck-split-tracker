function loadMapMode(map: string, mode: string, splits: {key:number, splitName: string, splitTime: number, resetCount: number}[]) {
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
            resetsSpan.textContent = `[${split.resetCount}]`;
            splitDiv.appendChild(resetsSpan);

            const diffSpan = document.createElement('span');
            diffSpan.className = 'split-diff';
            // Empty diff
            splitDiv.appendChild(diffSpan);

            const timeSpan = document.createElement('span');
            timeSpan.className = 'split-time';
            timeSpan.textContent = split.splitTime.toFixed(3);
            splitDiv.appendChild(timeSpan);

            splitsDiv.appendChild(splitDiv);
        });
    }
}

setTimeout(() => {
    loadMapMode(
        'Map 1',
        'Any%',
        [
            { key: 0, splitName: 'Bones', splitTime: 35.465, resetCount: 22 },
            { key: 1, splitName: 'Wind', splitTime: 29.231, resetCount: 90 },
            { key: 2, splitName: 'Grapes', splitTime: 61.231, resetCount: 19 }
        ]
    );
}, 2000);