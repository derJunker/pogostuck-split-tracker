import {updateFrontendSettings} from "./backend-state-handler";
import {updateSplitsAndGolds} from "./splits-tab-handler";

export function initPathsTabListeners() {
    // Steam Path
    const steamPathInput = document.getElementById('steam-path-text') as HTMLInputElement;
    steamPathInput.addEventListener('input', async () => {
        if (steamPathInput.value) {
            const value = steamPathInput.value;
            const settings = updateFrontendSettings(await window.electronAPI.onSteamUserDataPathChanged(value))
            const wasValidPath = settings.pogostuckSteamUserDataPath === value;
            if (wasValidPath) {
                steamPathInput.classList.remove('invalid');
                await updateSplitsAndGolds()
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
}
