import {
    getFrontendSettings,
    loadBackendMappings,
    updateFrontendSettings
} from "./backend-state-handler";
import {updateSplitsAndGolds} from "./splits-tab-handler";
import {Settings} from "../../types/settings";

interface SettingsInputProperty {
    element: HTMLInputElement;
    getValue: (settings: Settings) => any;
    setValue: (settings: Settings, value: any) => void;
    backendEvent: (value: any) => Promise<Settings> | Promise<void>;
    afterChange?: () => void;
}

const steamPathInput = document.getElementById('steam-path-text') as HTMLInputElement;
const steamFriendCode = document.getElementById('steam-friend-code') as HTMLInputElement;
const pogoPathInput = document.getElementById('pogo-path-text') as HTMLInputElement;
const splitNamingSelect = document.getElementById('split-naming-select') as HTMLSelectElement;
const backgroundColorInput = document.getElementById('set-background-color') as HTMLInputElement;


const hideSkippedSplits: SettingsInputProperty = {
    element: document.getElementById('ignore-skipped-splits') as HTMLInputElement,
    getValue: (settings: Settings) => settings.hideSkippedSplits,
    setValue: (settings: Settings, value: boolean) => { settings.hideSkippedSplits = value; },
    backendEvent: (value: boolean) => window.electronAPI.onOptionHideSkippedSplitsChanged(value)
}
const hideWindowWhenPogoNotActive: SettingsInputProperty = {
    element: document.getElementById('hide-when-pogo-not-active') as HTMLInputElement,
    getValue: (settings: Settings) => settings.hideWindowWhenPogoNotActive,
    setValue: (settings: Settings, value: boolean) => { settings.hideWindowWhenPogoNotActive = value; },
    backendEvent: (value: boolean) => window.electronAPI.onOptionHideWindowWhenPogoNotActive(value)
}

const onlyColorDiff: SettingsInputProperty = {
    element: document.getElementById('only-colored-diff') as HTMLInputElement,
    getValue: (settings: Settings) => settings.onlyDiffsColored,
    setValue: (settings: Settings, value: boolean) => { settings.onlyDiffsColored = value; },
    backendEvent: (value: boolean) => window.electronAPI.onOnlyDiffColoredChanged(value)
};

const raceGoldSplits: SettingsInputProperty = {
    element: document.getElementById('race-gold-splits') as HTMLInputElement,
    getValue: (settings: Settings) => settings.raceGoldSplits,
    setValue: (settings: Settings, value: boolean) => { settings.raceGoldSplits = value; },
    backendEvent: (value: boolean) => window.electronAPI.onRaceGoldsChanged(value)
};

const launchPogoOnStartup: SettingsInputProperty = {
    element: document.getElementById('launch-pogo-on-startup') as HTMLInputElement,
    getValue: (settings: Settings) => settings.launchPogoOnStartup,
    setValue: (settings: Settings, value: boolean) => { settings.launchPogoOnStartup = value; },
    backendEvent: (value: boolean) => window.electronAPI.onLaunchPogoOnStartupChanged(value)
};

const clickThroughOverlay: SettingsInputProperty = {
    element: document.getElementById('click-through-overlay') as HTMLInputElement,
    getValue: (settings: Settings) => settings.clickThroughOverlay,
    setValue: (settings: Settings, value: boolean) => { settings.clickThroughOverlay = value; },
    backendEvent: (value: boolean) => window.electronAPI.onOptionClickThroughOverlayChanged(value)
};

const showResetCounterToggle: SettingsInputProperty = {
    element: document.getElementById('show-reset-counters') as HTMLInputElement,
    getValue: (settings: Settings) => settings.showResetCounters,
    setValue: (settings: Settings, value: boolean) => { settings.showResetCounters = value; },
    backendEvent: (value: boolean) => window.electronAPI.onShowResetCountersChanged(value)
};

const reverseUDSplitsToggle: SettingsInputProperty = {
    element: document.getElementById('reverse-ud-splits') as HTMLInputElement,
    getValue: (settings: Settings) => settings.reverseUDModes,
    setValue: (settings: Settings, value: boolean) => { settings.reverseUDModes = value; },
    backendEvent: (value: boolean) => window.electronAPI.onReverseUDSplits(value)
};

const enableBackgroundColorToggle: SettingsInputProperty = {
    element: document.getElementById('enable-background-color') as HTMLInputElement,
    getValue: (settings: Settings) => settings.enableBackgroundColor,
    setValue: (settings: Settings, value: boolean) => { settings.enableBackgroundColor = value; },
    backendEvent: (value: boolean) => window.electronAPI.onEnableBackgroundColorChanged(value)
};

const showSobToggle: SettingsInputProperty = {
    element: document.getElementById('show-sob-toggle') as HTMLInputElement,
    getValue: (settings: Settings) => settings.showSoB,
    setValue: (settings: Settings, value: boolean) => { settings.showSoB = value; },
    backendEvent: (value: boolean) => window.electronAPI.onShowSoBChanged(value),
}

const showPaceToggle: SettingsInputProperty = {
    element: document.getElementById('show-pace-toggle') as HTMLInputElement,
    getValue: (settings: Settings) => settings.showPace,
    setValue: (settings: Settings, value: boolean) => { settings.showPace = value; },
    backendEvent: (value: boolean) => window.electronAPI.onShowPaceChanged(value),
}

const toggleButtons: SettingsInputProperty[] = [
    hideSkippedSplits,
    hideWindowWhenPogoNotActive,
    onlyColorDiff,
    raceGoldSplits,
    launchPogoOnStartup,
    clickThroughOverlay,
    showResetCounterToggle,
    reverseUDSplitsToggle,
    enableBackgroundColorToggle,
    showSobToggle,
    showPaceToggle,
];

const goldSplitColorInput: SettingsInputProperty = {
    element: document.getElementById('set-gold-split-color') as HTMLInputElement,
    getValue: (settings: Settings) => settings.goldSplitColor,
    setValue: (settings, value: string) => settings.goldSplitColor = value,
    backendEvent: (value: string) => window.electronAPI.onGoldSplitColorColorChanged(value)
}
const goldPaceColorInput: SettingsInputProperty = {
    element: document.getElementById('set-gold-pace-color') as HTMLInputElement,
    getValue: (settings: Settings) => settings.goldPaceColor,
    setValue: (settings, value: string) => settings.goldPaceColor = value,
    backendEvent: (value: string) => window.electronAPI.onGoldPaceColorColorChanged(value)
}
const fastSplitColorInput: SettingsInputProperty = {
    element: document.getElementById('set-fast-split-color') as HTMLInputElement,
    getValue: (settings: Settings) => settings.fastSplitColor,
    setValue: (settings, value: string) => settings.fastSplitColor = value,
    backendEvent: (value: string) => window.electronAPI.onFastSplitColorColorChanged(value)
}
const slowSplitColorInput: SettingsInputProperty = {
    element: document.getElementById('set-slow-split-color') as HTMLInputElement,
    getValue: (settings: Settings) => settings.slowSplitColor,
    setValue: (settings, value: string) => settings.slowSplitColor = value,
    backendEvent: (value: string) => window.electronAPI.onSlowSplitColorColorChanged(value)
}

const colorInputs: SettingsInputProperty[] = [
    goldSplitColorInput,
    goldPaceColorInput,
    fastSplitColorInput,
    slowSplitColorInput
]




export function setPreferenceTabValuesFromSettings() {
    initListeners()
    const settings = getFrontendSettings();

    steamPathInput.value = settings.steamPath;
    steamFriendCode.value = settings.userFriendCode;
    pogoPathInput.value = settings.pogostuckConfigPath;
    splitNamingSelect.value = settings.showNewSplitNames ? 'new' : 'old';

    toggleButtons.forEach(toggle => {
        toggle.element.checked = toggle.getValue(settings);
        toggle.element.dispatchEvent(new Event('change'));
    });

    colorInputs.forEach(colorInput => {
        colorInput.element.value = colorInput.getValue(settings)
        colorInput.element.dispatchEvent(new Event('change'));
    })

    backgroundColorInput.value = settings.backgroundColor;
    backgroundColorInput.dispatchEvent(new Event('input'));
}

function initListeners() {
    toggleButtons.forEach(toggle => {
        toggle.element.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            const newSettings = await toggle.backendEvent(checked) as Settings; // casting to settings, as the toggle buttons all return the settings
            updateFrontendSettings(newSettings);
            if (toggle.afterChange) toggle.afterChange();
        });
    })

    colorInputs.forEach(colorInput => {
        colorInput.element.addEventListener('change', async (e) => {
            const color = (e.target as HTMLInputElement).value;
            await colorInput.backendEvent(color); // no need to update the frontend settings for a simple color change in the overlay.
            if (colorInput.afterChange) colorInput.afterChange();
        })
    })

    splitNamingSelect.addEventListener('change', async (e) => {
        const value = (e.target as HTMLSelectElement).value === 'new';
        updateFrontendSettings(await window.electronAPI.onOptionShowNewSplitNamesChanged(value))
        await loadBackendMappings()
        await updateSplitsAndGolds()
    });

    backgroundColorInput.addEventListener('input', async (e) => {
        const value = (e.target as HTMLInputElement).value;
        await window.electronAPI.onBackgroundColorChanged(value)
    })
}