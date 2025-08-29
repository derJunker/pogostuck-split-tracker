import {createCustomLabledCheckbox} from "./custom-checkboxes";
import {formatPbTime, parsePbTime} from "../util/time-formating";
import {IpcRendererEvent} from "electron";
import {getFrontendMappings, getFrontendSettings, updateFrontendSettings} from "./backend-state-handler";

let mapSelect: HTMLSelectElement;
let modeSelect: HTMLSelectElement;

export async function initSplitsTab() {
    mapSelect = document.getElementById('map-select') as HTMLSelectElement;
    modeSelect = document.getElementById('mode-select') as HTMLSelectElement;

    loadLevelsFromMapping()
    updateModesForLevel()
    await updateSplitsAndGolds()
    mapSelect.addEventListener('change', async () => {
        updateModesForLevel()
        await updateSplitsAndGolds()
    });
    modeSelect.addEventListener('change', async () => {
        await updateSplitsAndGolds()
    });
}

export async function updateSplitsAndGolds() {
    __electronLog.debug(`Updating splits and golds for map ${mapSelect.value} and mode ${modeSelect.value}`);
    updateCheckpoints()
    await reloadGoldSplits()
    await reloadGoldPaces()
}

export async function reloadGoldSplitsIfModeActive(mode: number) {
    if (mode === parseInt(modeSelect.value, 10))
        await reloadGoldSplits();
}


function updateModesForLevel() {
    if (!mapSelect || !modeSelect) return;
    const mappings = getFrontendMappings();
    const selectedMapIndex = parseInt(mapSelect.value, 10);
    const selectedMap = mappings.find(m => m.mapIndex === selectedMapIndex);
    if (!selectedMap) return;

    modeSelect.innerHTML = '';
    selectedMap.modes.forEach(mode => {
        const modeOption = document.createElement('option');
        modeOption.value = mode.key.toString();
        modeOption.textContent = mode.name;
        modeSelect!.appendChild(modeOption);
    });

    modeSelect.selectedIndex = 0;
    updateCheckpoints();
}

function addSplitToSkippedSplits(splitSelectionDiv: HTMLElement, split: string, idx: number, skippedIndices: number[]) {
    const div = document.createElement('div');
    div.className = 'toggle-switch';
    const {label, checkbox, customCheckbox} = createCustomLabledCheckbox(`checkpoint-${idx}`, split,
        !skippedIndices.includes(idx), async (checked: boolean) => await updateSkippedSplits());

    div.appendChild(label);
    div.appendChild(checkbox);
    div.appendChild(customCheckbox);
    splitSelectionDiv.appendChild(div);
}

function loadLevelsFromMapping() {
    if (!mapSelect || !modeSelect) return;
    mapSelect.innerHTML = '';
    modeSelect.innerHTML = '';
    const mappings = getFrontendMappings();
    mappings.forEach(map => {
        const mapOption = document.createElement('option');
        mapOption.value = map.mapIndex.toString();
        mapOption.textContent = map.levelName;
        mapSelect!.appendChild(mapOption);
    });

    mapSelect.selectedIndex = 0;
}



async function reloadGoldSplits() {
    const mode = parseInt(modeSelect.value, 10);
    const map = parseInt(mapSelect.value, 10);
    const goldSplitSelection = document.getElementById('gold-split-selection')!

    const currentWidth = goldSplitSelection.offsetWidth;
    goldSplitSelection.style.width = currentWidth + 'px';

    goldSplitSelection.innerHTML = '';

    const title = document.createElement('h3')
    title.textContent = 'Gold Splits'
    goldSplitSelection.appendChild(title)

    const splitPath = await window.electronAPI.getSplitPath(mode)
    __electronLog.info(`split path: ${JSON.stringify(splitPath)}`);
    if (splitPath.length === 0) {
        return
    }
    const mappings = getFrontendMappings();
    const levelMappings = mappings.find(mapInfo => mapInfo.mapIndex === map)!
    const mapSplits = levelMappings.splits
    const udStartIndex = splitPath.findIndex(splitPathEl => splitPathEl.from === mapSplits.length);
    const udStart = splitPath[udStartIndex]
    const isUD: boolean = udStartIndex !== -1
    if (isUD) {
        splitPath.splice(udStartIndex, 1);
    }
    const settings = getFrontendSettings();
    const useOldNames = mapSelect.value === "0" && !settings.showNewSplitNames;

    const goldSplitTimes = await window.electronAPI.getGoldSplits(mode)
    appendAllGoldSplits(goldSplitSelection, goldSplitTimes, splitPath, mapSplits, levelMappings, udStart, isUD, useOldNames);

    setTimeout(() => {
        goldSplitSelection.style.width = '';
    }, 0);
}

async function reloadGoldPaces() {
    __electronLog.info(`reloading gold paces for mode ${modeSelect.value} and map ${mapSelect.value}`);
    const mode = parseInt(modeSelect.value, 10);
    const map = parseInt(mapSelect.value, 10);

    const goldPaceSelection = document.getElementById('gold-pace-selection')!

    const currentWidth = goldPaceSelection.offsetWidth;
    goldPaceSelection.style.width = currentWidth + 'px';

    goldPaceSelection.innerHTML = '';
    __electronLog.debug('Cleared gold pace selection div', goldPaceSelection.innerHTML);

    const title = document.createElement('h3')
    title.textContent = 'Best Paces'
    goldPaceSelection.appendChild(title)

    const levels = getFrontendMappings();
    const levelMappings = levels.find(level => level.mapIndex === map)!;

    const goldPaceTimes = await window.electronAPI.getGoldPaces(mode)
    __electronLog.debug(`Got gold pace times: ${JSON.stringify(goldPaceTimes)}`);
    appendAllGoldPaces(goldPaceSelection, goldPaceTimes, levelMappings);

    setTimeout(() => {
        goldPaceSelection.style.width = '';
    }, 0);
}

function appendAllGoldPaces(goldPaceSelection: HTMLElement, goldPaceTimes: { splitIndex: number, time: number; }[], levelMappings: { splits: string[] }) {
    //                         <label for="pace-0-input">Bones</label>
    //                         <input type="text" id="pace-0-input" class="input-field" placeholder="00:00.000">
    //                         <label for="pace-1-input">Wind</label>
    //                         <input type="text" id="pace-1-input" class="input-field" placeholder="00:00.000">
    levelMappings.splits.forEach((split, index) => {
        const splitTime  = goldPaceTimes.find(gp => gp.splitIndex === index);
        const label = document.createElement('label');
        label.setAttribute('for', `pace-${index}-input`);
        label.textContent = split;
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `pace-${index}-input`;
        input.value = splitTime  && splitTime.time !== 0? formatPbTime(splitTime.time, true) : '';
        input.className = 'pace-input';
        input.placeholder = '00:00.000';

        input.addEventListener('input', async (event) => {
            const inputValue = (event.target as HTMLInputElement).value
            const map = parseInt(mapSelect.value)
            const mode = parseInt(modeSelect.value)
            let time = parsePbTime(inputValue)
            if (inputValue.trim() === '') {
                time = 0;
            }
            let valid = time >= 0;
            if (valid) {
                valid = await window.electronAPI.onGoldenPaceEntered({
                    map: map,
                    mode: mode,
                    splitIndex: index,
                    time: time
                })
            }

            if (!valid) {
                input.classList.add('invalid');
                return;
            } else {
                input.classList.remove('invalid');
            }
        })

        goldPaceSelection.appendChild(label);
        goldPaceSelection.appendChild(input);
    })

}

function appendAllGoldSplits(
    goldSplitSelection: HTMLElement,
    goldSplitTimes: { from: number; to: number; time: number; }[],
    splitPath: { from: number; to: number; }[],
    mapSplits: string[],
    levelMappings: { endSplitName: string },
    udStart?: { from: number; to: number; },
    isUD?: boolean,
    useOldNames?: boolean
) {
    if (isUD) {
        appendSplit(levelMappings.endSplitName, udStart!.from, udStart!.to, goldSplitSelection, goldSplitTimes);
    }
    splitPath.forEach((splitPathEl, index) => {
        let name = mapSplits.find((name, index) => {
            if (useOldNames || isUD)
                return splitPathEl.from === index
            return splitPathEl.to === index
        })
        if (!name) {
            if (useOldNames) {
                name = "Start"
            } else {
                if (isUD) return
                else name = levelMappings.endSplitName
            }
        }
        appendSplit(name, splitPathEl.from,  splitPathEl.to, goldSplitSelection, goldSplitTimes);
    })
    const finishDiv = document.createElement('div');
    finishDiv.id = 'final';
    finishDiv.textContent = 'Finish';

    goldSplitSelection.appendChild(finishDiv);
}

async function updateSkippedSplits() {
    __electronLog.info("Updating skipped splits...");
    const selection = getSelectedMapAndMode();
    if (!selection) return;
    const { mapObj, modeObj } = selection;

    const splitSelectionDiv = document.getElementById('map-n-mode-split-selection');
    if (!splitSelectionDiv) return;

    const skippedSplitIndices: number[] = [];
    const checkpointDivs = splitSelectionDiv.querySelectorAll('div.toggle-switch');
    checkpointDivs.forEach((div, idx) => {
        const checkbox = div.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        if (!checkbox?.checked) {
            skippedSplitIndices.push(idx);
        }
    });

    const skippedSplits = {
        mode: modeObj.key,
        skippedSplitIndices
    };
    updateFrontendSettings(await window.electronAPI.onSkipSplitsChanged(skippedSplits));
    await reloadGoldSplits()
}

function getSelectedMapAndMode() {
    if (!mapSelect || !modeSelect) return null;
    const selectedMapName = mapSelect.options[mapSelect.selectedIndex].text;
    const selectedModeName = modeSelect.options[modeSelect.selectedIndex].text;

    const mapObj = getFrontendMappings().find(m => m.levelName === selectedMapName);
    if (!mapObj) return null;

    const modeObj = mapObj.modes.find(m => m.name === selectedModeName);
    if (!modeObj) return null;

    return { mapObj, modeObj };
}

function updateCheckpoints() {
    const selection = getSelectedMapAndMode();
    if (!selection) return;
    const { mapObj, modeObj } = selection;

    const splitSelectionDiv = document.getElementById('map-n-mode-split-selection');
    if (!splitSelectionDiv) return;

    const currentWidth = splitSelectionDiv.offsetWidth;
    splitSelectionDiv.style.width = currentWidth + 'px';

    splitSelectionDiv.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = `Split Skips`;
    splitSelectionDiv.appendChild(title);

    let skippedIndices: number[] = [];
    const skipObj = getFrontendSettings().skippedSplits.find(s => s.mode === modeObj.key);
    if (skipObj) {
        skippedIndices = skipObj.skippedSplitIndices;
    }

    mapObj.splits.forEach((split, idx) => {
        addSplitToSkippedSplits(splitSelectionDiv, split, idx, skippedIndices);
    });

    setTimeout(() => {
        splitSelectionDiv.style.width = '';
    }, 0);
}



function appendSplit(name: string, from: number, to: number, goldSplitSelection: HTMLElement, goldSplitTimes: {
    from: number;
    to: number;
    time: number;
}[]): void {
    const div = document.createElement('div');
    const arrow = document.createElement('img');
    arrow.src = './assets/curved-arrow.svg';
    arrow.alt = 'curved arrow pointing down';
    const label = document.createElement('label');
    label.setAttribute('for', `gold-${from}-${to}-input`);
    label.textContent = name;
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `gold-${from}-${to}-input`;
    input.className = 'input-field';
    input.placeholder = '00:00.000';
    const goldSplit = goldSplitTimes.find(gs => gs.from === from && gs.to === to);
    if (goldSplit && goldSplit.time > 0 && goldSplit.time < Infinity) {
        input.value = formatPbTime(goldSplit.time, true);
    } else {
        input.value = '';
    }

    input.addEventListener('input', async (event) => {
        const map = parseInt(mapSelect.value)
        const mode = parseInt(modeSelect.value)
        const time = parsePbTime((event.target as HTMLInputElement).value)
        let valid = time > 0;
        if (valid) {
            valid = await window.electronAPI.onGoldenSplitsEntered({
                map: map,
                mode: mode,
                from: from,
                to: to,
                time: time
            })
        }

        if (!valid) {
            input.classList.add('invalid');
            return;
        } else {
            input.classList.remove('invalid');
        }


    })

    div.appendChild(arrow);
    div.appendChild(label);
    div.appendChild(input);
    goldSplitSelection.appendChild(div);
}

window.electronAPI.mapAndModeChanged(async (event: Electron.IpcRendererEvent,
                                            mapAndMode: {
                                                map: number,
                                                mode: number
                                            }) => {
    // select the map in mapSelect to the value
    if (mapSelect && modeSelect) {
        mapSelect.value = mapAndMode.map.toString();
        updateModesForLevel();
        modeSelect.value = mapAndMode.mode.toString();
        await updateSplitsAndGolds()
    }
});

window.electronAPI.onGoldenSplitsImproved(async (event: IpcRendererEvent) => {
    await reloadGoldSplits();
});

window.electronAPI.onGoldPaceImproved(async (event: IpcRendererEvent) => {
    await reloadGoldPaces();
});

