import {getFrontendSettings, updateFrontendMappings, updateFrontendSettings} from "./backend-state-handler";
import {updateCheckpointsAndGoldSplits} from "./splits-tab-handler";

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

export function setPreferenceTabValuesFromSettings() {
    const settings = getFrontendSettings();

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

hideSkippedSplitsCheckbox.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateFrontendSettings(await window.electronAPI.onOptionHideSkippedSplitsChanged(checked))
});

onlyColorDiffCheckbox.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateFrontendSettings(await window.electronAPI.onOnlyDiffColoredChanged(checked))
});

launchPogoOnStartupCheckbox.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateFrontendSettings(await window.electronAPI.onLaunchPogoOnStartupChanged(checked))
});

// Split Names
clickThroughOverlayCheckbox.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateFrontendSettings(await window.electronAPI.onOptionClickThroughOverlayChanged(checked))
})

splitNamingSelect.addEventListener('change', async (e) => {
    const value = (e.target as HTMLSelectElement).value === 'new';
    updateFrontendSettings(await window.electronAPI.onOptionShowNewSplitNamesChanged(value))
    updateFrontendMappings(await window.electronAPI.getMappings())
    await updateCheckpointsAndGoldSplits()
});

enableBackgroundColorCheckbox.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    updateFrontendSettings(await window.electronAPI.onEnableBackgroundColorChanged(checked))
})
backgroundColorInput.addEventListener('input', async (e) => {
    const value = (e.target as HTMLInputElement).value;
    updateFrontendSettings(await window.electronAPI.onBackgroundColorChanged(value))
})