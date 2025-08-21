import './index.css';
import './components.css';

import './config-window/update-handler.ts'
import './config-window/special-circumstances-handler' // explicit import to make sure the code runs, maybe i should
// put it in a func but its fiiiineee
import { syncInitialCheckboxes } from "./config-window/custom-checkboxes";
import {showFullscreenMessageIfPlayingWithFullscreen, showWin11MessagesIfOnWin11} from "./config-window/special-circumstances-handler";
import {initSplitsTab} from "./config-window/splits-tab-handler";
import {
    getFrontendSettings,
    loadBackendPbs,
    loadSettingsAndMappingsFromBackend,
} from "./config-window/backend-state-handler";
import {setPreferenceTabValuesFromSettings} from "./config-window/preference-tab-handler";
import {initMenuNavListeners} from "./config-window/menu-buttons";
import {addEmptyPbInputFields, setPbValuesToInputs} from "./config-window/pb-tab-handler";
import {initPathsTabListeners} from "./config-window/paths-tab-handler";
import {initLanguageListeners} from "./config-window/language-handler";


window.addEventListener('DOMContentLoaded', async () => {
    await loadSettingsAndMappingsFromBackend()
    await loadBackendPbs();
    await showWin11MessagesIfOnWin11()
    await showFullscreenMessageIfPlayingWithFullscreen()

    syncInitialCheckboxes()
    setPreferenceTabValuesFromSettings()

    await initSplitsTab();

    addEmptyPbInputFields()
    setPbValuesToInputs()

    initMenuNavListeners()
    initPathsTabListeners();

    document.getElementById("launch-pogo-btn")?.addEventListener("click", async () => {
        await window.electronAPI.openPogostuck();
    })
    initLanguageListeners()
});
