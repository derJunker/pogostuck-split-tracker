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

function addSplitTimeAndDiff(splitKey: number, splitTime: string, diff: string, type: string) {
    const splitDiv = document.getElementById(splitKey.toString());
    if (splitDiv) {
        const timeSpan = splitDiv.querySelector('.split-time');
        if (timeSpan) timeSpan.textContent = splitTime;

        const diffSpan = splitDiv.querySelector('.split-diff');
        if (diffSpan) {
            diffSpan.textContent = diff;
            diffSpan.className = 'split-diff ' + type;
        }
    }
}

let splitCounter = 0;

loadMapMode(
    'Map 1',
    'reg',
    [
        { key: 0, splitName: 'Bones', splitTime: "0:17.465", resetCount: 22 },
        { key: 1, splitName: 'Wind', splitTime: "0:40.231", resetCount: 90 },
        { key: 2, splitName: 'Grapes', splitTime: "1:02.231", resetCount: 19 },
        { key: 3, splitName: 'Trees', splitTime: "1:17.231", resetCount: 15 },
        { key: 4, splitName: 'Pineapples', splitTime: "0:00.000", resetCount: 0 },
        { key: 5, splitName: "Palm Trees", splitTime: "1:40.151", resetCount: 120 },
        { key: 6, splitName: "Mushrooms", splitTime: "2:27.755", resetCount: 45 },
        { key: 7, splitName: "Flowers", splitTime: "2:08.144", resetCount: 30 },
        { key: 8, splitName: "Ice", splitTime: "2:29.066", resetCount: 60 },
    ]
);

document.querySelector("#load-mode-btn")?.addEventListener("click", () => {
    loadMapMode(
        'Map 1',
        'reg',
        [
            { key: 0, splitName: 'Bones', splitTime: "0:17.465", resetCount: 22 },
            { key: 1, splitName: 'Wind', splitTime: "0:40.231", resetCount: 90 },
            { key: 2, splitName: 'Grapes', splitTime: "1:02.231", resetCount: 19 },
            { key: 3, splitName: 'Trees', splitTime: "1:17.231", resetCount: 15 },
            { key: 4, splitName: 'Pineapples', splitTime: "0:00.000", resetCount: 0 },
            { key: 5, splitName: "Palm Trees", splitTime: "1:40.151", resetCount: 120 },
            { key: 6, splitName: "Mushrooms", splitTime: "2:27.755", resetCount: 45 },
            { key: 7, splitName: "Flowers", splitTime: "2:08.144", resetCount: 30 },
            { key: 8, splitName: "Ice", splitTime: "2:29.066", resetCount: 60 },
        ]
    );
    splitCounter = 0;
})

document.querySelector("#next-split-btn")?.addEventListener("click", () => {
    const diffs = [
        { diff: "-0:00.500", type: "golden" },
        { diff: "+0:00.123", type: "late" },
        { diff: "-0:00.234", type: "early" },
        { diff: "+0:00.000", type: "exact" }
    ];
    const random = Math.floor(Math.random() * 4);
    addSplitTimeAndDiff(splitCounter, "1:23.456", diffs[random].diff, diffs[random].type);
    splitCounter++;
})
