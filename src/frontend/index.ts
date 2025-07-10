// tab changing :)
const menuButtons: NodeListOf<HTMLElement> = document.querySelectorAll('.menu-btn');
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
    onlyDiffsColored: boolean,
    showNewSplitNames: boolean

    // split skips
    skippedSplits: {mode:number, skippedSplitIndices: number[]}[]
    launchPogoOnStartup: boolean;
}
let mappings: {
    levelName: string;
    mapIndex: number;
    splits: string[];
    endSplitName: string,
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

let mapSelect: HTMLSelectElement;
let modeSelect: HTMLSelectElement;

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
    addTabLinkListeners()
    await hideWin11ContentIfNeeded()
    await hideFullscreenMessageIfNeeded()

    syncInitialCheckboxes()
    setHtmlContentFromSettings()
    loadLevelsFromMapping()
    updateModesForLevel()
    updateCheckpoints()
    await reloadGoldSplits()
    mapSelect.addEventListener('change', async () => {
        updateModesForLevel()
        updateCheckpoints()
        await reloadGoldSplits()
    });
    modeSelect.addEventListener('change', async () => {
        updateCheckpoints()
        await reloadGoldSplits()
    });
    addPbsAsInputs()
    setPbsToInputs()


    menuButtons.forEach(btn => {
        const div = document.getElementById(btn.id.replace('-btn', '-content')) as HTMLElement | null;
        if (div && !btn.classList.contains('active')) {
            div.classList.add('hide');
            div.style.display = 'none';
        }
    });
});

window.electronAPI.mapAndModeChanged((event: Electron.IpcRendererEvent,
                                 mapAndMode: {
                                    map: number,
                                    mode: number
                                 }) => {
    // select the map in mapSelect to the value
    if (mapSelect && modeSelect) {
        mapSelect.value = mapAndMode.map.toString();
        updateModesForLevel();
        modeSelect.value = mapAndMode.mode.toString();
        updateCheckpoints();
    }
});

function addTabLinkListeners() {
    document.querySelectorAll('a[data-tab-link]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = (link as HTMLAnchorElement).getAttribute('data-tab-link')!;
            menuButtons.forEach((btn) => {
                if (btn.id === targetId + '-btn') {
                    btn.click();
                }
            });
        });
    })
}

async function hideWin11ContentIfNeeded() {
    const isWin11 = await window.electronAPI.isWindows11();
    __electronLog.info("Is Windows 11: ", isWin11);
    if (!isWin11) {
        const win11Content = document.querySelectorAll('.only-win11')
        win11Content.forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.display = 'none';
        });
    }
}

async function hideFullscreenMessageIfNeeded() {
    const isFullscreen = await window.electronAPI.hasPogostuckFullscreen();
    __electronLog.info("Has Pogostuck fullscreen: ", isFullscreen);
    if (!isFullscreen) {
        const fsContent = document.querySelectorAll('.only-fs')
        fsContent.forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.display = 'none';
        });
    }
}

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
    const onlyColorDiffCheckbox = document.getElementById('only-colored-diff') as HTMLInputElement;
    const launchPogoOnStartupCheckbox = document.getElementById('launch-pogo-on-startup') as HTMLInputElement;
    const splitNamingSelect = document.getElementById('split-naming-select') as HTMLSelectElement;

    steamPathInput.value = settings.pogostuckSteamUserDataPath;
    pogoPathInput.value = settings.pogostuckConfigPath;
    splitNamingSelect.value = settings.showNewSplitNames ? 'new' : 'old';

    hideSkippedSplitsCheckbox.checked = settings.hideSkippedSplits;
    hideSkippedSplitsCheckbox.dispatchEvent(new Event('change'));

    onlyColorDiffCheckbox.checked = settings.onlyDiffsColored;
    onlyColorDiffCheckbox.dispatchEvent(new Event('change'));

    launchPogoOnStartupCheckbox.checked = settings.launchPogoOnStartup;
    launchPogoOnStartupCheckbox.dispatchEvent(new Event('change'));
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

document.getElementById('only-colored-diff')?.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    settings = await window.electronAPI.onOnlyDiffColoredChanged(checked);
});

document.getElementById('launch-pogo-on-startup')?.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    settings = await window.electronAPI.onLaunchPogoOnStartupChanged(checked);
});

// Split Names
document.getElementById('split-naming-select')?.addEventListener('change', async (e) => {
    const value = (e.target as HTMLSelectElement).value === 'new';
    settings = await window.electronAPI.onOptionShowNewSplitNamesChanged(value);
    mappings = await window.electronAPI.getMappings();
    updateCheckpoints()
});

// Steam Path
const steamPathInput = document.getElementById('steam-path-text') as HTMLInputElement;
steamPathInput.addEventListener('input', async () => {
    if (steamPathInput.value) {
        const value = steamPathInput.value;
        settings = await window.electronAPI.onSteamUserDataPathChanged(value);
        const wasValidPath = settings.pogostuckSteamUserDataPath === value;
        if (wasValidPath) {
            steamPathInput.classList.remove('invalid');
        }
        else {
            steamPathInput.classList.add('invalid');
        }
    }
});

// Pogo Path
const pogoPathInput = document.getElementById('pogo-path-text') as HTMLInputElement;
pogoPathInput.addEventListener('input', async () => {
    if (pogoPathInput.value) {
        const value = pogoPathInput.value
        settings = await window.electronAPI.onPogostuckConfigPathChanged(value);
        const wasValidPath = settings.pogostuckConfigPath === value;
        if (wasValidPath) {
            pogoPathInput.classList.remove('invalid');
        }
        else {
            pogoPathInput.classList.add('invalid');
        }
    }
});

document.getElementById("open-settings-link")?.addEventListener("click", async () => {
    await window.electronAPI.openWindowsSettings();
});

document.getElementById("launch-pogo-btn" )?.addEventListener("click", async () => {
    await window.electronAPI.openPogostuck();
})

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
    settings = await window.electronAPI.onSkipSplitsChanged(skippedSplits);
    await reloadGoldSplits()
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

async function reloadGoldSplits() {
    const goldSplitSelection = document.getElementById('gold-split-selection')!
    goldSplitSelection.innerHTML = '';

    const splitPath = await window.electronAPI.getSplitPath(parseInt(modeSelect.value))
    __electronLog.info(`split path: ${JSON.stringify(splitPath)}`);
    const levelMappings = mappings.find(map => map.mapIndex === parseInt(mapSelect.value, 10))!
    const mapSplits = levelMappings.splits
    const udStart = splitPath.find(splitPathEl => splitPathEl.from === mapSplits.length)
    const isUD: boolean = udStart !== undefined
    if (isUD) {
        appendSplit(levelMappings.endSplitName, udStart!.from, udStart!.to, goldSplitSelection);
    }
    splitPath.forEach((splitPathEl, index) => {
        let name = mapSplits.find((name, index) => splitPathEl.to === index)
        if (!name) {
            if (isUD) return
            else name = levelMappings.endSplitName
        }

        appendSplit(name, splitPathEl.from,  splitPathEl.to, goldSplitSelection);
    })
    // const finalSplitIndex = mapSplits.length;
    // const finalName = levelMappings.endSplitName
    // appendSplit(finalName, finalSplitIndex, goldSplitSelection);
    const finishDiv = document.createElement('div');
    finishDiv.id = 'final';
    finishDiv.textContent = 'Finish';

    goldSplitSelection.appendChild(finishDiv);
}

function appendSplit(name: string, from: number, to: number
    , goldSplitSelection: HTMLElement): void {
    const div = document.createElement('div');
    const arrow = document.createElement('img');
    arrow.src = '../assets/left-down-arrow-curve-svgrepo-com.svg';
    arrow.alt = 'curved arrow pointing down';
    const label = document.createElement('label');
    label.setAttribute('for', `gold-${from}-${to}-input`);
    label.textContent = name;
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `gold-${from}-${to}-input`;
    input.className = 'input-field';
    input.placeholder = '00:00.000';

    div.appendChild(arrow);
    div.appendChild(label);
    div.appendChild(input);
    goldSplitSelection.appendChild(div);
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
            input.placeholder = '00:00.000';
            input.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    const valid = await onPbEntered(input, mode.key)
                    if (valid) input.blur();
                }
            });

            const button = document.createElement('button');
            button.innerHTML = `<img src="../assets/diskette.png" alt="Save Icon" id="save-pb-mode-${mode.key}">`;
            button.addEventListener('click', async () => {
                await onPbEntered(input, mode.key);
            });


            pbContentDiv.appendChild(label);
            pbContentDiv.appendChild(input);
            pbContentDiv.appendChild(button);
        });
    });

}

async function onPbEntered(input: HTMLInputElement, modeKey: number): Promise<boolean> {
    const time = parsePbTime((input as HTMLInputElement).value);
    if (time < 0) {
        input.classList.add('invalid');
        return false;
    } else if (time === 0) {
        return false;
    } else {
        input.classList.remove('invalid');
    }
    __electronLog.info(`PB entered for mode ${modeKey}: ${time}`);
    await window.electronAPI.onPbEntered({mode: modeKey, time: time});
    return true;
}

function setPbsToInputs() {
    document.querySelectorAll('input[type="text"][id^="pb-mode-"]').forEach(input => {
        const modeIndex = parseInt(input.id.replace('pb-mode-', ''), 10);
        const pb = pbs.find(p => p.mode === modeIndex);
        if (pb && pb.time && pb.time < Infinity && pb.time !== 0) {
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

/*
 * Beautifully vibe coded :)
 */
function parsePbTime(timeStr: string): number {
    const trimmed = timeStr.trim();
    if (!trimmed) return -1;
    const parts = trimmed.split(":");
    if (parts.length > 3) return -1;
    let h = 0, m = 0, s = 0, ms = 0;
    let secPart = parts[parts.length - 1];
    const secMatch = /^(\d{1,2})(?:\.(\d{1,3}))?$/.exec(secPart);
    if (!secMatch) return -1;
    s = parseInt(secMatch[1], 10);
    if (secMatch[2]) {
        if (secMatch[2].length > 3) return -1;
        ms = parseInt(secMatch[2].padEnd(3, '0'), 10);
    }
    if (parts.length === 3) {
        h = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
    } else if (parts.length === 2) {
        m = parseInt(parts[0], 10);
    }
    // Fix: map parts correctly (3: h, m, s; 2: m, s; 1: s)
    if (parts.length === 3) {
        h = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
    } else if (parts.length === 2) {
        m = parseInt(parts[0], 10);
    } else if (parts.length === 1) {
        // only seconds, already set
    }
    return h * 3600 + m * 60 + s + ms / 1000;
}