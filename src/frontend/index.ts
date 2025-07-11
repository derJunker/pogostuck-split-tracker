import './index.css';
import './components.css';

import './config-window/update-handler.ts'
import './config-window/special-circumstances-handler' // explicit import to make sure the code runs, maybe i should
// put it in a func but its fiiiineee
import { syncInitialCheckboxes } from "./config-window/custom-checkboxes";
import {formatPbTime, parsePbTime} from "./util/time-formating";
import {showFullscreenMessageIfPlayingWithFullscreen, showWin11MessagesIfOnWin11} from "./config-window/special-circumstances-handler";
import {initSplitsTab, reloadGoldSplitsIfModeActive} from "./config-window/splits-tab-handler";
import {getFrontendMappings, loadSettingsAndMappingsFromBackend, updateFrontendSettings} from "./config-window/backend-state-handler";
import {setPreferenceTabValuesFromSettings} from "./config-window/preference-tab-handler";
import {initMenuNavListeners} from "./config-window/menu-buttons";

let pbs : {
    mode: number;
    time: number;
}[]

window.addEventListener('DOMContentLoaded', async () => {
    await loadSettingsAndMappingsFromBackend()
    pbs = await window.electronAPI.getPbs();
    await showWin11MessagesIfOnWin11()
    await showFullscreenMessageIfPlayingWithFullscreen()

    syncInitialCheckboxes()
    setPreferenceTabValuesFromSettings()

    await initSplitsTab();

    addPbsAsInputs()
    setPbsToInputs()

    initMenuNavListeners()
});

// Steam Path
const steamPathInput = document.getElementById('steam-path-text') as HTMLInputElement;
steamPathInput.addEventListener('input', async () => {
    if (steamPathInput.value) {
        const value = steamPathInput.value;
        const settings = updateFrontendSettings(await window.electronAPI.onSteamUserDataPathChanged(value))
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
        const settings = updateFrontendSettings(await window.electronAPI.onPogostuckConfigPathChanged(value))
        const wasValidPath = settings.pogostuckConfigPath === value;
        if (wasValidPath) {
            pogoPathInput.classList.remove('invalid');
        }
        else {
            pogoPathInput.classList.add('invalid');
        }
    }
});

document.getElementById("launch-pogo-btn")?.addEventListener("click", async () => {
    await window.electronAPI.openPogostuck();
})

function addPbsAsInputs() {
    const pbContentDiv = document.getElementById('pbs-content');
    if (!pbContentDiv) return;
    const mappings = getFrontendMappings();
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
            button.innerHTML = `<img src="./assets/diskette.png" alt="Save Icon" id="save-pb-mode-${mode.key}">`;
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
    await reloadGoldSplitsIfModeActive(modeKey)
    return true;
}

function setPbsToInputs(): void {
    document.querySelectorAll('input[type="text"][id^="pb-mode-"]').forEach(input => {
        const modeIndex = parseInt(input.id.replace('pb-mode-', ''), 10);
        const pb = pbs.find(p => p.mode === modeIndex);
        if (pb && pb.time && pb.time < Infinity && pb.time !== 0) {
            (input as HTMLInputElement).value = formatPbTime(pb.time);
        }
    });
}
