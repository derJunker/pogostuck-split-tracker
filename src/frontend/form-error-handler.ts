// global div where a list of elements with errors is stored
// div id = error-messages
// error class = error-message
// each error is a div with the message inside
// To make transitions there is always 1 empty error message field with class "hidden"
// when you add an error you fill the hidden field and add a new empty hidden field
// then add another hidden field

let errorContainer: HTMLDivElement | null = null;
let hiddenErrorElement: HTMLDivElement | null = null;

window.addEventListener('DOMContentLoaded', () => {
    errorContainer = document.getElementById('error-messages') as HTMLDivElement;
    createHiddenErrorElement()
});

export function addError(inputElement: HTMLInputElement, errorMessage?:string): void {
    inputElement.classList.add('invalid')
    if (!errorMessage) return;

    if (!errorContainer) {
        __electronLog.error('Tried to add an error but errorContainer is null');
        return
    }
    if (!hiddenErrorElement) {
        __electronLog.error('Tried to add an error but hiddenErrorElement is null');
        return
    }
    hiddenErrorElement.innerText = errorMessage;
    hiddenErrorElement.classList.remove('hidden');
    const errorElement = hiddenErrorElement;
    setTimeout(() => {
        errorElement.classList.add('hidden');
        setTimeout(() => errorElement.remove(), 500)
    }, 3000)
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