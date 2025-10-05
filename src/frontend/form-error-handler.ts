// global div where a list of elements with errors is stored
// div id = error-messages
// error class = error-message
// each error is a div with the message inside
// To make transitions there is always 1 empty error message field with class "hidden"
// when you add an error you fill the hidden field and add a new empty hidden field
// then add another hidden field

import {Settings} from "../types/settings";
import {getFrontendSettings, updateFrontendSettings} from "./config-window/backend-state-handler";
import {getErrorMessage} from "./error-messages";
import {error} from "electron-log";

let errorContainer: HTMLDivElement | null = null;
let hiddenErrorElement: HTMLDivElement | null = null;

window.addEventListener('DOMContentLoaded', () => {
    errorContainer = document.getElementById('error-messages') as HTMLDivElement;
    createHiddenErrorElement()
});

export function addError(inputElement: HTMLInputElement, errorCode?: string, ...args:string[]): void {
    const settings = getFrontendSettings()
    inputElement.classList.add('invalid')
    if (!errorCode) return;

    if (!errorContainer) {
        __electronLog.error('Tried to add an error but errorContainer is null');
        return
    }
    if (!hiddenErrorElement) {
        __electronLog.error('Tried to add an error but hiddenErrorElement is null');
        return
    }
    hiddenErrorElement.innerText = getErrorMessage(errorCode, settings.lang, ...args);
    hiddenErrorElement.classList.remove('hidden');
    const errorElement = hiddenErrorElement;
    setTimeout(() => {
        errorElement.classList.add('hidden');
        setTimeout(() => errorElement.remove(), 500)
    }, 5000)
    hiddenErrorElement = null;
    createHiddenErrorElement();
}

export function createHiddenErrorElement() {
    if (hiddenErrorElement && hiddenErrorElement.textContent && hiddenErrorElement.textContent !== '') {
        __electronLog.error(`Tried to create a hidden error element but one already exists with text: ${hiddenErrorElement.textContent}`);
        return
    }
    if (!errorContainer) {
        __electronLog.error('Tried to create a hidden error element but errorContainer is null');
        return
    }
    hiddenErrorElement = document.createElement('div');
    hiddenErrorElement.classList.add('error-message', 'hidden');
    hiddenErrorElement.textContent = ""
    errorContainer.appendChild(hiddenErrorElement);
}

export function removeError(inputElement: HTMLInputElement): void {
    inputElement.classList.remove('invalid')
}

export function addEnterAndWaitValidator(inputElement: HTMLInputElement, validator: (value: string) => Promise<boolean>, errorCode: string, ...args: string[]) {
    let debounceTimeout: NodeJS.Timeout | null = null;
    let errorTriggered = false;
    let currentDelay = 1000;

    inputElement.addEventListener('input', () => {
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
            debounceTimeout = null;
        }
        debounceTimeout = setTimeout(async () => {
            const valid = await validator(inputElement.value);
            if (!valid) {
                addError(inputElement, errorCode, ...args);
                errorTriggered = true;
                currentDelay = 3000; // Increase delay after error
            } else {
                removeError(inputElement);
                errorTriggered = false;
                currentDelay = 1000; // Reset delay when valid
            }
        }, currentDelay);
    });

    inputElement.addEventListener('keydown', async (event) => {
        if (event.key === "Enter") {
            const valid = await validator(inputElement.value)
            if (!valid) addError(inputElement, errorCode, ...args)
            else removeError(inputElement)
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
                debounceTimeout = null;
                currentDelay = 1000;
            }
        }
    })
}