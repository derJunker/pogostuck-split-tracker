import {
    getFrontendCustomModes,
    getFrontendMappings,
    loadBackendCustomModes, loadBackendPbs, loadSettingsAndMappingsFromBackend, updateFrontendMappings
} from "./backend-state-handler";
import {addEmptyPbInputFields, setPbValuesToInputs} from "./pb-tab-handler";
import {loadLevelsFromMappingSplitTab, updateModesForLevel, updateSplitsAndGolds} from "./splits-tab-handler";
import {addError, removeError} from "../form-error-handler";

let mapSelect: HTMLSelectElement;
let modeSelect: HTMLSelectElement;
let customModeNameInput: HTMLInputElement;
let saveNameButton: HTMLButtonElement;
let playButton: HTMLButtonElement;
let deleteButton: HTMLButtonElement;
let stopButton: HTMLButtonElement;
let buttonsContainer: HTMLDivElement;
let nameContainer: HTMLDivElement;
let isUDModeToggle: HTMLInputElement;

let currentCustomMode: number | null = null;

export function initializeCustomModeTabHandler() {
    mapSelect = document.getElementById("regular-map-select") as HTMLSelectElement;
    modeSelect = document.getElementById("custom-mode-select") as HTMLSelectElement;
    customModeNameInput = document.getElementById("custom-mode-name") as HTMLInputElement;
    saveNameButton = document.getElementById("save-custom-mode") as HTMLButtonElement;
    playButton = document.getElementById("play-custom-mode") as HTMLButtonElement;
    deleteButton = document.getElementById("delete-custom-mode") as HTMLButtonElement;
    stopButton = document.getElementById("stop-custom-mode") as HTMLButtonElement;
    buttonsContainer = document.getElementById("custom-mode-name-container") as HTMLDivElement;
    nameContainer = document.getElementById("custom-mode-btns") as HTMLDivElement;
    isUDModeToggle = document.getElementById("custom-mode-is-ud-toggle") as HTMLInputElement;

    mapSelect.addEventListener("change", onMapChange);
    modeSelect.addEventListener("change", (_) => {
        if (modeSelect.value === "+" && modeSelect.selectedIndex === 0 && modeSelect.options[0].id === "create-custom-mode-option") {
            onModeCreate().then(() => {});
            return;
        }
        onModeChange();
    });
    saveNameButton.addEventListener("click", () => onSaveName(customModeNameInput.value));
    customModeNameInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            onSaveName(customModeNameInput.value).then(() => {});
            customModeNameInput.blur();
        }
    });
    isUDModeToggle.addEventListener("change", async (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        await window.electronAPI.onCustomModeIsUDModeChanged(checked, parseInt(modeSelect.value));
    });
    playButton.addEventListener("click", () => onPlayCustomMode(parseInt(modeSelect.value)));
    deleteButton.addEventListener("click", () => onDeleteCustomMode(parseInt(modeSelect.value)));
    stopButton.addEventListener("click", () => onStopCustomMode());

    window.electronAPI.onCustomModeStopped(() => {
        showPlayButton(true)
        currentCustomMode = null;
    });

    loadLevelsFromMapping()
    loadCustomModesForMap();

    window.electronAPI.mapAndModeChanged((_, mapAndMode) => {
        if (mapSelect.value !== mapAndMode.map.toString()) {
            mapSelect.value = mapAndMode.map.toString();
            onMapChange();
        }
    })
}

function loadLevelsFromMapping() {
    __electronLog.debug(`[Frontend] Loading levels from mapping`);
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


function loadCustomModesForMap() {
    if (!mapSelect || !modeSelect) return;
    modeSelect.innerHTML = '';
    addCreateOption();
    const selectedMapIndex = parseInt(mapSelect.value);
    const customModesForMap = getFrontendCustomModes().filter(cm => cm.map === selectedMapIndex);
    customModesForMap.forEach(cm => {
        const modeName = getFrontendMappings().find(m => m.mapIndex === selectedMapIndex)?.modes.find(m => m.key === cm.modeIndex)?.name || `Mode ${cm.modeIndex}`;
        const modeOption = document.createElement('option');
        modeOption.value = cm.modeIndex.toString();
        modeOption.textContent = modeName
        modeOption.id = `custom-mode-${cm.modeIndex}-option`;
        modeSelect!.appendChild(modeOption);
    });

    modeSelect.selectedIndex = 1;
    onModeChange();
}

function addCreateOption() {
    const createOption = document.createElement('option');
    createOption.value = "+";
    createOption.textContent = "Create New";
    createOption.id = "create-custom-mode-option";
    modeSelect.appendChild(createOption);
}

function onMapChange() {
    loadCustomModesForMap();
}

async function onModeCreate() {
    playButton.disabled = true;
    const modeInfo = await window.electronAPI.onCreateCustomMode(Number.parseInt(mapSelect.value));
    customModeNameInput.value = modeInfo.name;
    await loadSettingsAndMappingsFromBackend()
    await loadBackendPbs();
    await loadBackendCustomModes()
    loadCustomModesForMap();
    modeSelect.value = modeInfo.index.toString();
    onModeChange();
    customModeNameInput.focus();
    await updateOtherTabs();
}

function onModeChange() {
    __electronLog.info(`Mode changed to ${modeSelect.value}`);
    if (modeSelect.value.length === 0) {
        customModeNameInput.value = "";
        buttonsContainer.style.display = 'none';
        nameContainer.style.display = 'none';
        return;
    }
    const selectedModeIndex = parseInt(modeSelect.value);
    const selectedMapIndex = parseInt(mapSelect.value);
    const customMode = getFrontendCustomModes().find(cm => cm.map === selectedMapIndex && cm.modeIndex === selectedModeIndex);
    if (customMode) {
        customModeNameInput.value = getFrontendMappings().find(m => m.mapIndex === selectedMapIndex)?.modes.find(m => m.key === customMode.modeIndex)?.name || `Mode ${customMode.modeIndex}`;
        playButton.disabled = false;
        deleteButton.disabled = false;
        buttonsContainer.style.display = 'flex';
        nameContainer.style.display = 'flex';
        showPlayButton(customMode.modeIndex !== currentCustomMode)
    } else {
        customModeNameInput.value = "";
        buttonsContainer.style.display = 'none';
        nameContainer.style.display = 'none';
    }
}

async function onSaveName(name: string) {
    __electronLog.debug("[Frontend] Save name", name);
    const previousIndex = modeSelect.selectedIndex;
    removeError(customModeNameInput)
    if (name.trim().length === 0) {
        addError(customModeNameInput, "Name cannot be empty");
        return;
    }
    __electronLog.debug(`[Frontend] previous index: ${previousIndex}, value: ${modeSelect.value}`);
    updateFrontendMappings(await window.electronAPI.onCustomModeSave(parseInt(modeSelect.value), name))
    await updateOtherTabs();
    loadCustomModesForMap()
    modeSelect.selectedIndex = previousIndex;
    onModeChange();
}

function onPlayCustomMode(mode: number) {
    window.electronAPI.onPlayCustomMode(mode).then(validChange => {
        if (validChange) {
            showPlayButton(false)
            currentCustomMode = mode;
        }
    });
}

function onStopCustomMode() {
    window.electronAPI.onPlayCustomMode(-1).then(validChange => {
        if (validChange) {
            showPlayButton(true)
            currentCustomMode = null;
        }
    })
}
async function onDeleteCustomMode(mode: number) {
    __electronLog.debug("[Frontend] Delete custom mode", mode);
    const previousIndex = modeSelect.selectedIndex;
    await window.electronAPI.onDeleteCustomMode(mode);
    await loadSettingsAndMappingsFromBackend()
    await loadBackendPbs();
    await loadBackendCustomModes()
    loadCustomModesForMap()

    await updateOtherTabs()

    modeSelect.selectedIndex = Math.max(previousIndex - 1, 1);
    onModeChange();
}

async function updateOtherTabs() {
    // Pb Tab
    addEmptyPbInputFields();
    setPbValuesToInputs();

    // Splits tab
    loadLevelsFromMappingSplitTab()
    updateModesForLevel()
    await updateSplitsAndGolds()
}

function showPlayButton(boolean: boolean) {
    if (boolean) {
        playButton.style.display = 'inline';
        stopButton.style.display = 'none';
    } else {
        playButton.style.display = 'none';
        stopButton.style.display = 'inline';
    }
}
