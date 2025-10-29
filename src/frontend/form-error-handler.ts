import {getFrontendSettings} from "./config-window/backend-state-handler";
import {getMessageByKey} from "./error-messages";

let messageContainer: HTMLDivElement | null = null;
let hiddenMessageElement: HTMLDivElement | null = null;

window.addEventListener('DOMContentLoaded', () => {
    messageContainer = document.getElementById('messages') as HTMLDivElement;
    createHiddenMessageElement()
});

function htmlBaseIsValid(): boolean {
    if (!messageContainer) {
        __electronLog.error('Tried to check if html base is valid but errorContainer is null');
        return false
    }
    if (!hiddenMessageElement) {
        __electronLog.error('Tried to check if html base is valid but hiddenMessageElement is null');
        return false
    }
    return true;
}

function showCurrentHiddenMessageElement() {
    hiddenMessageElement!.classList.remove('hidden');
    const messageElement = hiddenMessageElement;
    setTimeout(() => {
        messageElement!.classList.add('hidden');
        setTimeout(() => messageElement!.remove(), 500)
    }, 5000)
    hiddenMessageElement = null;
    createHiddenMessageElement();
}

export function addInfoMessage(messageCode: string, ...args: string[]): void {
    const settings = getFrontendSettings()
    if (!htmlBaseIsValid()) return;

    hiddenMessageElement!.innerText = getMessageByKey(messageCode, settings.lang, ...args);
    hiddenMessageElement!.classList.add('info-message');
    showCurrentHiddenMessageElement();
}

export function addError(inputElement: HTMLInputElement, errorCode?: string, ...args:string[]): void {
    const settings = getFrontendSettings()
    inputElement.classList.add('invalid')
    if (!errorCode) return;
    if(!htmlBaseIsValid()) return;

    hiddenMessageElement!.innerText = getMessageByKey(errorCode, settings.lang, ...args);
    hiddenMessageElement!.classList.add('error-message');
    showCurrentHiddenMessageElement();
    __electronLog.error(`[SHOW ERROR] '${errorCode}': ${hiddenMessageElement!.innerText}`);
}

export function createHiddenMessageElement(): void {
    if (hiddenMessageElement && hiddenMessageElement.textContent && hiddenMessageElement.textContent !== '') {
        __electronLog.error(`Tried to create a hidden error element but one already exists with text: ${hiddenMessageElement.textContent}`);
        return
    }
    if (!messageContainer) {
        __electronLog.error('Tried to create a hidden error element but errorContainer is null');
        return
    }
    hiddenMessageElement = document.createElement('div');
    hiddenMessageElement.classList.add('message', 'hidden');
    hiddenMessageElement.textContent = ""
    messageContainer.appendChild(hiddenMessageElement);
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