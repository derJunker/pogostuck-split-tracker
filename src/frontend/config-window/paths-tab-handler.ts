import {getFrontendSettings, updateFrontendSettings} from "./backend-state-handler";
import {updateSplitsAndGolds} from "./splits-tab-handler";
import path from "path";

export function initPathsTabListeners() {
    // Steam Path
    const steamPathInput = document.getElementById('steam-path-text') as HTMLInputElement;
    steamPathInput.addEventListener('input', async () => {
        if (steamPathInput.value) {
            const value = steamPathInput.value;
            const settings = updateFrontendSettings(await window.electronAPI.onSteamUserDataPathChanged(value))
            const wasValidPath = settings.steamPath === value;
            if (wasValidPath) {
                steamPathInput.classList.remove('invalid');
                await updateSplitsAndGolds()
            }
            else {
                steamPathInput.classList.add('invalid');
            }
        }
    });

    const steamFriendCode = document.getElementById('steam-friend-code') as HTMLInputElement;
    steamFriendCode.addEventListener('input', async () => {
        if (steamFriendCode.value) {
            const value = steamFriendCode.value;
            const settings = updateFrontendSettings(await window.electronAPI.onSteamFriendCodeChanged(value))
            const wasValidCode = settings.userFriendCode === value;
            if (wasValidCode) {
                steamFriendCode.classList.remove('invalid');
            }
            else {
                steamFriendCode.classList.add('invalid');
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

    window.electronAPI.onPogoPathFound((event, path) => {
        pogoPathInput.value = path;
        pogoPathInput.classList.remove('invalid');
        const settings = getFrontendSettings();
        settings.pogostuckConfigPath = path;
    })

    window.electronAPI.onUserDataPathFound((event, path) => {
        steamPathInput.value = path;
        steamPathInput.classList.remove('invalid');
        const settings = getFrontendSettings();
        settings.steamPath = path;
    })
    
    window.electronAPI.onSteamFriendCodeFound((event, code) => {
        steamFriendCode.value = code;
        steamFriendCode.classList.remove('invalid');
        const settings = getFrontendSettings();
        settings.userFriendCode = code;
    })


}
