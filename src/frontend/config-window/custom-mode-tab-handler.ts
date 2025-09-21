import {
    getFrontendCustomModes,
    getFrontendMappings,
    loadBackendCustomModes, updateFrontendMappings,
    updateFrontendSettings
} from "./backend-state-handler";

let mapSelect: HTMLSelectElement;
let modeSelect: HTMLSelectElement;
let customModeNameInput: HTMLInputElement;
let saveNameButton: HTMLButtonElement;
let playButton: HTMLButtonElement;
let deleteButton: HTMLButtonElement;

export function initializeCustomModeTabHandler() {
    mapSelect = document.getElementById("regular-map-select") as HTMLSelectElement;
    modeSelect = document.getElementById("custom-mode-select") as HTMLSelectElement;
    customModeNameInput = document.getElementById("custom-mode-name") as HTMLInputElement;
    saveNameButton = document.getElementById("save-custom-mode") as HTMLButtonElement;
    playButton = document.getElementById("play-custom-mode") as HTMLButtonElement;
    deleteButton = document.getElementById("delete-custom-mode") as HTMLButtonElement;

    mapSelect.addEventListener("change", onMapChange);
    modeSelect.addEventListener("change", (e) => {
        if (modeSelect.value === "+" && modeSelect.selectedIndex === 0 && modeSelect.options[0].id === "create-custom-mode-option") {
            onModeCreate();
            return;
        }
        onModeChange();
    });
    saveNameButton.addEventListener("click", () => onSaveName(customModeNameInput.value));
    playButton.addEventListener("click", () => onPlayCustomMode(parseInt(modeSelect.value)));
    deleteButton.addEventListener("click", () => onDeleteCustomMode(parseInt(modeSelect.value)));

    loadLevelsFromMapping()
    loadCustomModesForMap();
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
    const modeIndex = await window.electronAPI.onCreateCustomMode(Number.parseInt(mapSelect.value));
    customModeNameInput.value = `Mode ${modeIndex}`;
    await loadBackendCustomModes();
    loadCustomModesForMap();
    modeSelect.value = modeIndex.toString();
    onModeChange();
}

function onModeChange() {
    if (modeSelect.value.length === 0) return;
    const selectedModeIndex = parseInt(modeSelect.value);
    const selectedMapIndex = parseInt(mapSelect.value);
    const customMode = getFrontendCustomModes().find(cm => cm.map === selectedMapIndex && cm.modeIndex === selectedModeIndex);
    if (customMode) {
        customModeNameInput.value = getFrontendMappings().find(m => m.mapIndex === selectedMapIndex)?.modes.find(m => m.key === customMode.modeIndex)?.name || `Mode ${customMode.modeIndex}`;
        playButton.disabled = false;
        deleteButton.disabled = false;
    } else {
        customModeNameInput.value = "";
    }
}

async function onSaveName(name: string) {
    __electronLog.debug("[Frontend] Save name", name);
    updateFrontendMappings(await window.electronAPI.onCustomModeSave(parseInt(modeSelect.value), name))
}
function onPlayCustomMode(mode: number) {
    __electronLog.debug("[Frontend] Play custom mode", mode);
    window.electronAPI.onPlayCustomMode(mode).then(r => {});
}
function onDeleteCustomMode(mode: number) {
    __electronLog.debug("[Frontend] Delete custom mode", mode);
    window.electronAPI.onDeleteCustomMode(mode).then(r => {});
}
