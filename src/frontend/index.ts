import './styles/index.css';
import './styles/loading-screen.css'
import './styles/menus.css'
import './styles/components.css';
import './styles/preferences.css'
import './styles/error-messages.css'
import './styles/custom-modes.css'
import './styles/pbs-tab.css'
import './styles/splits-tab.css'
import './styles/modals.css'

import './config-window/update-handler.ts'
import './config-window/special-circumstances-handler' // explicit import to make sure the code runs, maybe i should
// put it in a func but its fiiiineee
import { syncInitialCheckboxes } from "./config-window/custom-checkboxes";
import {showFullscreenMessageIfPlayingWithFullscreen, showWin11MessagesIfOnWin11} from "./config-window/special-circumstances-handler";
import {initSplitsTab} from "./config-window/splits-tab-handler";
import {
    loadBackendCustomModes,
    loadBackendPbs,
    loadSettingsAndMappingsFromBackend,
} from "./config-window/backend-state-handler";
import {setPreferenceTabValuesFromSettings} from "./config-window/preference-tab-handler";
import {initMenuNavListeners} from "./config-window/menu-buttons";
import {addEmptyPbInputFields, setPbValuesToInputs} from "./config-window/pb-tab-handler";
import {initPathsTabListeners} from "./config-window/paths-tab-handler";
import {initLanguageListeners} from "./config-window/language-handler";
import {initLaunchPogostuckButtonListeners} from "./config-window/launch-pogostuck-button-handler";
import {initDebugButtonListeners} from "./config-window/debug-tab-handler";
import {initializeCustomModeTabHandler} from "./config-window/custom-mode-tab-handler";
import {hideLoadingScreen} from "./config-window/loading-screen-handler";


window.addEventListener('DOMContentLoaded', async () => {
    initLaunchPogostuckButtonListeners();

    await loadSettingsAndMappingsFromBackend();
    await loadBackendPbs();
    await loadBackendCustomModes();

    await showWin11MessagesIfOnWin11();
    await showFullscreenMessageIfPlayingWithFullscreen();

    syncInitialCheckboxes();
    setPreferenceTabValuesFromSettings();

    await initSplitsTab();
    initializeCustomModeTabHandler();

    addEmptyPbInputFields();
    setPbValuesToInputs();

    initMenuNavListeners();
    initPathsTabListeners();
    initDebugButtonListeners();

    initLanguageListeners();

    document.getElementById('buy-coffee')?.addEventListener('click', () => window.electronAPI.openLinkInBrowser("https://buymeacoffee.com/derjunker"));
    document.querySelectorAll('.yt-vid').forEach(anchor => anchor.addEventListener('click', () => window.electronAPI.openLinkInBrowser("https://www.youtube.com/watch?v=TiV_zLOi0zc")))

    document.getElementById('version')!.textContent = await window.electronAPI.getVersion();

    hideLoadingScreen();
});

