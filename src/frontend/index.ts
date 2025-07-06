// tab changing :)
const menuButtons = document.querySelectorAll('.menu-btn');
const contentDivs = document.querySelectorAll('.menu-content');

let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let showTimeout: ReturnType<typeof setTimeout> | null = null;

// prolly not nice, but i didnt find a way to have the same type interfaces for both frontend and backend
let settings: {
    // Paths
    pogostuckConfigPath: string;
    pogostuckSteamUserDataPath: string;
    // Design
    hideSkippedSplits: boolean,
    showNewSplitNames: boolean

    // split skips
    skippedSplits: {mode:number, skippedSplitIndices: number[]}[]
}
let mappings: {
    levelName: string;
    mapIndex: number;
    splits: string[];
    modes: {
        key: number;
        name: string;
        settingsName: string;
    }[];
}[] = [];

let pbs : {
    mode: number;
    time: number;
}[]

let mapSelect: HTMLSelectElement | null;
let modeSelect: HTMLSelectElement | null;

menuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        if (showTimeout) {
            clearTimeout(showTimeout);
            showTimeout = null;
        }
        menuButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        contentDivs.forEach(div => {
            const htmlDiv = div as HTMLElement;
            if (div.id !== btn.id.replace('-btn', '-content')) {
                htmlDiv.classList.add('hide');
                hideTimeout = setTimeout(() => {
                    if (htmlDiv.classList.contains('hide')) {
                        htmlDiv.style.display = 'none';
                    }
                }, 300);
            }
        });
        showTimeout = setTimeout(() => {
            contentDivs.forEach(div => {
                const htmlDiv = div as HTMLElement;
                if (div.id === btn.id.replace('-btn', '-content')) {
                    htmlDiv.style.display = '';
                    void htmlDiv.offsetWidth;
                    htmlDiv.classList.remove('hide');
                }
            });
        }, 300);
    });
});

window.addEventListener('DOMContentLoaded', async () => {
    settings = await window.electronAPI.loadSettings();
    mappings = await window.electronAPI.getMappings();
    pbs = await window.electronAPI.getPbs();
    mapSelect = document.getElementById('map-select') as HTMLSelectElement;
    modeSelect = document.getElementById('mode-select') as HTMLSelectElement;
    syncInitialCheckboxes()
    setHtmlContentFromSettings()
    loadLevelsFromMapping()
    updateModesForLevel()
    updateCheckpoints()
    mapSelect.addEventListener('change', () => {
        updateModesForLevel()
        updateCheckpoints()
    });
    modeSelect.addEventListener('change', updateCheckpoints);
    addPbsAsInputs()
    setPbsToInputs()


    menuButtons.forEach(btn => {
        const div = document.getElementById(btn.id.replace('-btn', '-content')) as HTMLElement | null;
        if (div && !btn.classList.contains('active')) {
            div.classList.add('hide');
            div.style.display = 'none';
        }
    });

    addPbModeChangeListeners();
});

function syncInitialCheckboxes() {
    document.querySelectorAll('input[type="checkbox"][id]').forEach(inputEl => {
        const checkbox = inputEl as HTMLInputElement;
        const customCheckbox = document.getElementById(checkbox.id + '-custom') as HTMLElement | null;
        if (customCheckbox && !checkbox.id.startsWith('checkpoint-')) {
            const label = document.querySelector(`label[for="${checkbox.id}"]`) as HTMLLabelElement | null;
            label?.addEventListener('click', (e) => customCheckbox.focus());
            customCheckbox.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
                syncCustomCheckbox(checkbox, customCheckbox);
            });
            checkbox.addEventListener('change', () => syncCustomCheckbox(checkbox, customCheckbox));
            syncCustomCheckbox(checkbox, customCheckbox);
        }
    });
}

function setHtmlContentFromSettings() {
    const steamPathInput = document.getElementById('steam-path-text') as HTMLInputElement;
    const pogoPathInput = document.getElementById('pogo-path-text') as HTMLInputElement;
    const hideSkippedSplitsCheckbox = document.getElementById('ignore-skipped-splits') as HTMLInputElement;
    const splitNamingSelect = document.getElementById('split-naming-select') as HTMLSelectElement;

    steamPathInput.value = settings.pogostuckSteamUserDataPath;
    pogoPathInput.value = settings.pogostuckConfigPath;
    hideSkippedSplitsCheckbox.checked = settings.hideSkippedSplits;
    hideSkippedSplitsCheckbox.dispatchEvent(new Event('change'));
    splitNamingSelect.value = settings.showNewSplitNames ? 'new' : 'old';
}

function syncCustomCheckbox(checkbox: HTMLInputElement, customCheckbox: HTMLElement) {
    if (checkbox.checked) {
        customCheckbox.classList.add('checked');
    } else {
        customCheckbox.classList.remove('checked');
    }
}

// Hide skipped splits
document.getElementById('ignore-skipped-splits')?.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    settings = await window.electronAPI.onOptionHideSkippedSplitsChanged(checked);
});

// Split Names
document.getElementById('split-naming-select')?.addEventListener('change', async (e) => {
    const value = (e.target as HTMLSelectElement).value === 'new';
    settings = await window.electronAPI.onOptionShowNewSplitNamesChanged(value);
});

// Steam Path
const steamPathInput = document.getElementById('steam-path-text') as HTMLInputElement;
steamPathInput.addEventListener('input', async () => {
    if (steamPathInput.value) {
        settings = await window.electronAPI.onSteamUserDataPathChanged(steamPathInput.value);
    }
});

// Pogo Path
const pogoPathInput = document.getElementById('pogo-path-text') as HTMLInputElement;
pogoPathInput.addEventListener('input', async () => {
    if (pogoPathInput.value) {
        settings = await window.electronAPI.onPogostuckConfigPathChanged(pogoPathInput.value);
    }
});

function getSelectedMapAndMode() {
    if (!mapSelect || !modeSelect) return null;
    const selectedMapName = mapSelect.options[mapSelect.selectedIndex].text;
    const selectedModeName = modeSelect.options[modeSelect.selectedIndex].text;

    const mapObj = mappings.find(m => m.levelName === selectedMapName);
    if (!mapObj) return null;

    const modeObj = mapObj.modes.find(m => m.name === selectedModeName);
    if (!modeObj) return null;

    return { mapObj, modeObj };
}

const updateSkippedSplits = async () => {
    console.log("Updating skipped splits...");
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
    settings = await window.electronAPI.onSkipSplitsChanged(skippedSplits);
};

function updateCheckpoints() {
    const selection = getSelectedMapAndMode();
    if (!selection) return;
    const { mapObj, modeObj } = selection;

    const splitSelectionDiv = document.getElementById('map-n-mode-split-selection');
    if (!splitSelectionDiv) return;

    splitSelectionDiv.innerHTML = '';

    let skippedIndices: number[] = [];
    console.log("current settings: ", JSON.stringify(settings));
    const skipObj = settings.skippedSplits.find(s => s.mode === modeObj.key);
    if (skipObj) {
        skippedIndices = skipObj.skippedSplitIndices;
    }

    mapObj.splits.forEach((split, idx) => {
        addSplitToSkippedSplits(splitSelectionDiv, split, idx, skippedIndices);
    });
}

function addSplitToSkippedSplits(splitSelectionDiv: HTMLElement, split: string, idx: number, skippedIndices: number[]) {
    const div = document.createElement('div');
    div.className = 'toggle-switch';
    const label = document.createElement('label');
    label.setAttribute('for', `checkpoint-${idx}`);
    label.className = 'toggle-label';
    label.textContent = split;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `checkpoint-${idx}`;
    checkbox.className = 'toggle-checkbox';
    // Setze checked auf false, wenn Index in skippedIndices, sonst true
    checkbox.checked = !skippedIndices.includes(idx);
    const customCheckbox = document.createElement('button');
    customCheckbox.id = `checkpoint-${idx}-custom`;
    customCheckbox.className = 'custom-checkbox';

    label.addEventListener('click', (e) => customCheckbox.focus());
    customCheckbox.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
        customCheckbox.focus()
    });
    checkbox.addEventListener('change',async () => {
        syncCustomCheckbox(checkbox, customCheckbox)
        await updateSkippedSplits();
    });

    syncCustomCheckbox(checkbox, customCheckbox);

    div.appendChild(label);
    div.appendChild(checkbox);
    div.appendChild(customCheckbox);
    splitSelectionDiv.appendChild(div);
}

function loadLevelsFromMapping() {
    if (!mapSelect || !modeSelect) return;
    mapSelect.innerHTML = '';
    modeSelect.innerHTML = '';

    mappings.forEach(map => {
        const mapOption = document.createElement('option');
        mapOption.value = map.mapIndex.toString();
        mapOption.textContent = map.levelName;
        mapSelect!.appendChild(mapOption);
    });

    mapSelect.selectedIndex = 0;
}

function updateModesForLevel() {
    if (!mapSelect || !modeSelect) return;
    const selectedMapIndex = parseInt(mapSelect.value, 10);
    console.log("Selected map index: ", selectedMapIndex);
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


function addPbModeChangeListeners() {
    document.querySelectorAll('input[type="text"][id^="pb-mode-"]').forEach(input => {
            input.addEventListener('input', async (e) => {
                const time = parsePbTime((input as HTMLInputElement).value)
                console.log(`PB time entered: ${(input as HTMLInputElement).value}`);
                if (time < 0) {
                    console.error(`Invalid PB time format: ${(input as HTMLInputElement).value}`);
                    return;
                }
                const modeIndex = parseInt(input.id.replace('pb-mode-', ''), 10);
                console.log(`PB entered for mode ${modeIndex}: ${time}`);
                await window.electronAPI.onPbEntered({mode: modeIndex, time: time});
            });
    });
}

function addPbsAsInputs() {
    const pbContentDiv = document.getElementById('pbs-content');
    if (!pbContentDiv) return;
    pbContentDiv.innerHTML = ''; // Clear existing content
    mappings.forEach(map => {
        const mapHeader = document.createElement('h3');
        mapHeader.textContent = map.levelName;
        pbContentDiv.appendChild(mapHeader);

        map.modes.forEach(mode => {
            const label = document.createElement('label');
            label.setAttribute('for', `pb-mode-${mode.key}`);
            label.textContent = `${mode.name}:`;

            const input = document.createElement('input');
            input.type = 'text';
            input.id = `pb-mode-${mode.key}`;
            input.className = 'input-field';
            input.placeholder = '00:00:00.000';

            pbContentDiv.appendChild(label);
            pbContentDiv.appendChild(input);
        });
    });

}

function setPbsToInputs() {
    document.querySelectorAll('input[type="text"][id^="pb-mode-"]').forEach(input => {
        const modeIndex = parseInt(input.id.replace('pb-mode-', ''), 10);
        const pb = pbs.find(p => p.mode === modeIndex);
        if (pb) {
            (input as HTMLInputElement).value = formatPbTime(pb.time);
        }
    });
}

function formatPbTime(seconds: number): string {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = Math.floor(absSeconds % 60);
    const ms = Math.round((absSeconds - Math.floor(absSeconds)) * 1000);

    const msStr = ms.toString().padStart(3, '0').slice(0, 3);

    const minsStr = mins.toString().padStart(2, '0');
    const secsStr = secs.toString().padStart(2, '0');

    return `${minsStr}:${secsStr}.${msStr}`;
}

function parsePbTime(timeStr: string): number {
    // Erwartetes Format: "MM:SS.mmm"
    const match = /^(\d{2}):(\d{2})\.(\d{3})$/.exec(timeStr);
    if (!match) {
        return -1;
    }
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    const ms = parseInt(match[3], 10);
    return mins * 60 + secs + ms / 1000;
}