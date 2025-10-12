import {getFrontendSettings, updateFrontendSettings} from "./backend-state-handler";
import {updateSplitsAndGolds} from "./splits-tab-handler";
import path from "path";
import {addEnterAndWaitValidator, addError, removeError} from "../form-error-handler";
import {Settings} from "../../types/settings";

export function initPathsTabListeners() {
    // Steam Path
    const steamPathInput = document.getElementById('steam-path-text') as HTMLInputElement;
    const steamFriendCode = document.getElementById('steam-friend-code') as HTMLInputElement;

    steamPathInput.addEventListener('input', async () => {
        const value = steamPathInput.value;
        const settings = updateFrontendSettings(await window.electronAPI.onSteamUserDataPathChanged(value, steamFriendCode.value))
        const wasValidPath = settings.steamPath === value;
        const wasValidCode = settings.userFriendCode === steamFriendCode.value;
        if (wasValidPath) {
            removeError(steamPathInput);
            if (wasValidCode) {
                removeError(steamFriendCode)
                await updateSplitsAndGolds()
            }
        } else {
            addError(steamPathInput)
        }
    });
    addSettingsErrorValidator(steamPathInput, "Steam Path",
        (steamPath: string) => window.electronAPI.onSteamUserDataPathChanged(steamPath, steamFriendCode.value), (settings) => settings.steamPath);

    steamFriendCode.addEventListener('input', async (event) => {
        const value = steamFriendCode.value;
        const settings = updateFrontendSettings(await window.electronAPI.onSteamFriendCodeChanged(value))
        const wasValidCode = settings.userFriendCode === value;
        if (wasValidCode) {
            removeError(steamFriendCode)
        }
        else {
            addError(steamFriendCode)
        }
    });
    addSettingsErrorValidator(steamFriendCode, "Steam Friend Code",
        window.electronAPI.onSteamFriendCodeChanged, (settings) => settings.userFriendCode);

    // Pogo Path
    const pogoPathInput = document.getElementById('pogo-path-text') as HTMLInputElement;
    pogoPathInput.addEventListener('input', async () => {
        const value = pogoPathInput.value
        const settings = updateFrontendSettings(await window.electronAPI.onPogostuckConfigPathChanged(value))
        const wasValidPath = settings.pogostuckConfigPath === value;
        if (wasValidPath) {
            addError(pogoPathInput)
        }
        else {
            removeError(pogoPathInput)
        }
    });
    addSettingsErrorValidator(pogoPathInput, "Pogostuck Config Path",
        window.electronAPI.onPogostuckConfigPathChanged, (settings) => settings.pogostuckConfigPath);


    window.electronAPI.onPogoPathFound((event, path) => {
        pogoPathInput.value = path;
        removeError(pogoPathInput)
        const settings = getFrontendSettings();
        settings.pogostuckConfigPath = path;
    })

    window.electronAPI.onSteamPathFound((event, path) => {
        steamPathInput.value = path;
        removeError(steamPathInput)
        const settings = getFrontendSettings();
        settings.steamPath = path;
    })
    
    window.electronAPI.onSteamFriendCodeFound((event, code) => {
        steamFriendCode.value = code;
        removeError(steamFriendCode)
        const settings = getFrontendSettings();
        settings.userFriendCode = code;
    })
}

function addSettingsErrorValidator(inputElement: HTMLInputElement, fieldName: string,
                               backendUpdater: (value:string) => Promise<Settings>,
                               settingsField: (settings:Settings) => string) {
    addEnterAndWaitValidator(inputElement, async (value) => {
        const settings = updateFrontendSettings(await backendUpdater(value))
        return settingsField(settings) === value;
    }, 'FIELD_NOT_FOUND', fieldName);
}
