export function syncInitialCheckboxes() {
    document.querySelectorAll('input[type="checkbox"][id]').forEach(inputEl => {
        const checkbox = inputEl as HTMLInputElement;
        const customCheckbox = document.getElementById(checkbox.id + '-custom') as HTMLElement | null;
        if (customCheckbox && !checkbox.id.startsWith('checkpoint-')) {
            const label = document.querySelector(`label[for="${checkbox.id}"]`) as HTMLLabelElement | null;
            label?.addEventListener('click', (e) => customCheckbox.focus());
            customCheckbox.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
                syncCustomCheckbox(checkbox, customCheckbox);
            });
            checkbox.addEventListener('change', () => syncCustomCheckbox(checkbox, customCheckbox));
            syncCustomCheckbox(checkbox, customCheckbox);
        }
    });
}

export function syncCustomCheckbox(checkbox: HTMLInputElement, customCheckbox: HTMLElement) {
    if (checkbox.checked) {
        customCheckbox.classList.add('checked');
    } else {
        customCheckbox.classList.remove('checked');
    }
}

export function createCustomLabledCheckbox(checkboxId: string, labelText: string, initialState: boolean, changeListener: (checked: boolean) => void): { label: HTMLLabelElement, checkbox: HTMLInputElement, customCheckbox: HTMLElement } {
    const label = document.createElement('label');
    label.setAttribute('for', checkboxId);
    label.className = 'toggle-label';
    label.textContent = labelText;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = checkboxId;
    checkbox.className = 'toggle-checkbox';

    checkbox.checked = initialState;
    const customCheckbox = document.createElement('button');
    customCheckbox.id = `${checkboxId}-custom`;
    customCheckbox.className = 'custom-checkbox';

    label.addEventListener('click', (e) => customCheckbox.focus());
    customCheckbox.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
        customCheckbox.focus()
    });
    checkbox.addEventListener('change',async () => {
        syncCustomCheckbox(checkbox, customCheckbox)
        changeListener(checkbox.checked);
    });

    syncCustomCheckbox(checkbox, customCheckbox);
    return { label, checkbox, customCheckbox };
}