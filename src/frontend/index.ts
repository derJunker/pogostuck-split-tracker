import { IpcRendererEvent } from 'electron';
import { syncInitialCheckboxes } from "./config-window/custom-checkboxes";
import {formatPbTime, parsePbTime} from "./util/time-formating";

import './index.css';
import './components.css';

import './config-window/update-handler.ts'
import {
    showFullscreenMessageIfPlayingWithFullscreen,
    showWin11MessagesIfOnWin11
} from "./config-window/special-circumstances-handler";
import {
    initSplitsTab,
    reloadGoldSplitsIfModeActive,
    updateCheckpointsAndGoldSplits
} from "./config-window/splits-tab-handler";
import {
    getFrontendMappings,
    getFrontendSettings,
    loadSettingsAndMappingsFromBackend,
    updateFrontendMappings,
    updateFrontendSettings
} from "./config-window/backend-state-handler";

const menuButtons: NodeListOf<HTMLElement> = document.querySelectorAll('.menu-btn');
const contentDivs = document.querySelectorAll('.menu-content');

let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let showTimeout: ReturnType<typeof setTimeout> | null = null;

let pbs : {
    mode: number;
    time: number;
}[]



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
    await loadSettingsAndMappingsFromBackend()
    pbs = await window.electronAPI.getPbs();
    addTabLinkListeners()
    await showWin11MessagesIfOnWin11()
    await showFullscreenMessageIfPlayingWithFullscreen()

    syncInitialCheckboxes()
    setHtmlContentFromSettings()

    await initSplitsTab();

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


function setHtmlContentFromSettings() {
    const settings = getFrontendSettings();
    const steamPathInput = document.getElementById('steam-path-text') as HTMLInputElement;
    const pogoPathInput = document.getElementById('pogo-path-text') as HTMLInputElement;
    const hideSkippedSplitsCheckbox = document.getElementById('ignore-skipped-splits') as HTMLInputElement;
    const onlyColorDiffCheckbox = document.getElementById('only-colored-diff') as HTMLInputElement;
    const launchPogoOnStartupCheckbox = document.getElementById('launch-pogo-on-startup') as HTMLInputElement;
    const clickThroughOverlayCheckbox = document.getElementById('click-through-overlay') as HTMLInputElement;
    const splitNamingSelect = document.getElementById('split-naming-select') as HTMLSelectElement;

    // color picker stuff
    const enableBackgroundColorCheckbox = document.getElementById('enable-background-color') as HTMLInputElement;
    const backgroundColorInput = document.getElementById('set-background-color') as HTMLInputElement;

    steamPathInput.value = settings.pogostuckSteamUserDataPath;
    pogoPathInput.value = settings.pogostuckConfigPath;
    splitNamingSelect.value = settings.showNewSplitNames ? 'new' : 'old';

    hideSkippedSplitsCheckbox.checked = settings.hideSkippedSplits;
    hideSkippedSplitsCheckbox.dispatchEvent(new Event('change'));

    onlyColorDiffCheckbox.checked = settings.onlyDiffsColored;
    onlyColorDiffCheckbox.dispatchEvent(new Event('change'));

    launchPogoOnStartupCheckbox.checked = settings.launchPogoOnStartup;
    launchPogoOnStartupCheckbox.dispatchEvent(new Event('change'));

    clickThroughOverlayCheckbox.checked = settings.clickThroughOverlay;
    clickThroughOverlayCheckbox.dispatchEvent(new Event('change'));

    enableBackgroundColorCheckbox.checked = settings.enableBackgroundColor;
    enableBackgroundColorCheckbox.dispatchEvent(new Event('change'));

    backgroundColorInput.value = settings.backgroundColor;
    backgroundColorInput.dispatchEvent(new Event('input'));
}

// Hide skipped splits
document.getElementById('ignore-skipped-splits')?.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateFrontendSettings(await window.electronAPI.onOptionHideSkippedSplitsChanged(checked))
});

document.getElementById('only-colored-diff')?.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateFrontendSettings(await window.electronAPI.onOnlyDiffColoredChanged(checked))
});

document.getElementById('launch-pogo-on-startup')?.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateFrontendSettings(await window.electronAPI.onLaunchPogoOnStartupChanged(checked))
});

// Split Names
document.getElementById('click-through-overlay')?.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateFrontendSettings(await window.electronAPI.onOptionClickThroughOverlayChanged(checked))
})

document.getElementById('split-naming-select')?.addEventListener('change', async (e) => {
    const value = (e.target as HTMLSelectElement).value === 'new';
    updateFrontendSettings(await window.electronAPI.onOptionShowNewSplitNamesChanged(value))
    updateFrontendMappings(await window.electronAPI.getMappings())
    await updateCheckpointsAndGoldSplits()
});

document.getElementById('enable-background-color')?.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateFrontendSettings(await window.electronAPI.onEnableBackgroundColorChanged(checked))
})
document.getElementById('set-background-color')?.addEventListener('input', async (e) => {
    const value = (e.target as HTMLInputElement).value;
    updateFrontendSettings(await window.electronAPI.onBackgroundColorChanged(value))
})

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

document.getElementById("open-settings-link")?.addEventListener("click", async () => {
    await window.electronAPI.openWindowsSettings();
});

document.getElementById("launch-pogo-btn" )?.addEventListener("click", async () => {
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
