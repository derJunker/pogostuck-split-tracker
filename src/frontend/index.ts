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
    console.log("Settings loaded: ", settings);
    mappings = await window.electronAPI.getMappings();
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


    menuButtons.forEach(btn => {
        const div = document.getElementById(btn.id.replace('-btn', '-content')) as HTMLElement | null;
        if (div && !btn.classList.contains('active')) {
            div.classList.add('hide');
            div.style.display = 'none';
        }
    });
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
    await window.electronAPI.onOptionHideSkippedSplitsChanged(checked);
});

// Split Names
document.getElementById('split-naming-select')?.addEventListener('change', async (e) => {
    const value = (e.target as HTMLSelectElement).value === 'new';
    await window.electronAPI.onOptionShowNewSplitNamesChanged(value);
});

// Steam Path
const steamPathInput = document.getElementById('steam-path-text') as HTMLInputElement;
steamPathInput.addEventListener('input', async () => {
    if (steamPathInput.value) {
        await window.electronAPI.onSteamUserDataPathChanged(steamPathInput.value);
    }
});

// Pogo Path
const pogoPathInput = document.getElementById('pogo-path-text') as HTMLInputElement;
pogoPathInput.addEventListener('input', async () => {
    if (pogoPathInput.value) {
        await window.electronAPI.onPogostuckConfigPathChanged(pogoPathInput.value);
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

    const skippedSplits = [{
        mode: modeObj.key,
        skippedSplitIndices
    }];
    await window.electronAPI.onSkipSplitsChanged(skippedSplits);
};

function updateCheckpoints() {
    const selection = getSelectedMapAndMode();
    if (!selection) return;
    const { mapObj, modeObj } = selection;

    const splitSelectionDiv = document.getElementById('map-n-mode-split-selection');
    if (!splitSelectionDiv) return;

    splitSelectionDiv.innerHTML = '';

    let skippedIndices: number[] = [];
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

    modeSelect.selectedIndex = 0; // Reset to first mode
    updateCheckpoints(); // Update checkpoints for the new map and mode
}
