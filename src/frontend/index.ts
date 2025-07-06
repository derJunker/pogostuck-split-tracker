// tab changing :)
const menuButtons = document.querySelectorAll('.menu-btn');
const contentDivs = document.querySelectorAll('.menu-content');

let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let showTimeout: ReturnType<typeof setTimeout> | null = null;

// prolly not nice, but i didnt find a way to have the same type interfaces for both frontend and backend
let settings: {
    // Paths
    pogostuckConfigPath: string;
    pogostuckSteamUserDataPath: string;
    // Design
    hideSkippedSplits: boolean,
    showNewSplitNames: boolean

    // split skips
    skippedSplits: {mode:number, skippedSplitIndices: number[]}[]
}
let mappings: {
    levelName: string;
    mapIndex: number;
    splits: string[];
    modes: {
        key: number;
        name: string;
        settingsName: string;
    }[];
}[] = [];

menuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        if (showTimeout) {
            clearTimeout(showTimeout);
            showTimeout = null;
        }
        menuButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        contentDivs.forEach(div => {
            const htmlDiv = div as HTMLElement;
            if (div.id !== btn.id.replace('-btn', '-content')) {
                htmlDiv.classList.add('hide');
                hideTimeout = setTimeout(() => {
                    if (htmlDiv.classList.contains('hide')) {
                        htmlDiv.style.display = 'none';
                    }
                }, 300);
            }
        });
        showTimeout = setTimeout(() => {
            contentDivs.forEach(div => {
                const htmlDiv = div as HTMLElement;
                if (div.id === btn.id.replace('-btn', '-content')) {
                    htmlDiv.style.display = '';
                    void htmlDiv.offsetWidth;
                    htmlDiv.classList.remove('hide');
                }
            });
        }, 300);
    });
});

window.addEventListener('DOMContentLoaded', async () => {
    settings = await window.electronAPI.loadSettings();
    mappings = await window.electronAPI.getMappings();

    menuButtons.forEach(btn => {
        const div = document.getElementById(btn.id.replace('-btn', '-content')) as HTMLElement | null;
        if (div && !btn.classList.contains('active')) {
            div.classList.add('hide');
            div.style.display = 'none';
        }
    });

    document.querySelectorAll('input[type="checkbox"][id]').forEach(inputEl => {
        const checkbox = inputEl as HTMLInputElement;
        const customCheckbox = document.getElementById(checkbox.id + '-custom') as HTMLElement | null;
        if (customCheckbox) {
            const syncCustomCheckbox = () => {
                if (checkbox.checked) {
                    customCheckbox.classList.add('checked');
                } else {
                    customCheckbox.classList.remove('checked');
                }
            };
            customCheckbox.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
                syncCustomCheckbox();
            });
            checkbox.addEventListener('change', syncCustomCheckbox);
            syncCustomCheckbox();

            if (checkbox.id.startsWith('checkpoint-')) {
                checkbox.addEventListener('change', updateSkippedSplits);
            }
        }
    });
});

// Hide skipped splits
document.getElementById('ignore-skipped-splits')?.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    await window.electronAPI.onOptionHideSkippedSplitsChanged(checked);
});

// Split Names
document.getElementById('split-naming-select')?.addEventListener('change', async (e) => {
    const value = (e.target as HTMLSelectElement).value === 'new';
    await window.electronAPI.onOptionShowNewSplitNamesChanged(value);
});

// Steam Path
document.getElementById('select-steam-path-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('steam-path-text') as HTMLInputElement;
    if (input?.value) {
        await window.electronAPI.onSteamUserDataPathChanged(input.value);
    }
});

// Pogo Path
document.getElementById('select-pogo-path-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('pogo-path-text') as HTMLInputElement;
    if (input?.value) {
        await window.electronAPI.onPogostuckConfigPathChanged(input.value);
    }
});

const updateSkippedSplits = async () => {
    const mapSelect = document.getElementById('map-select') as HTMLSelectElement | null;
    const modeSelect = document.getElementById('mode-select') as HTMLSelectElement | null;
    if (!mapSelect || !modeSelect) return;

    const selectedMapName = mapSelect.options[mapSelect.selectedIndex].text;
    const selectedModeName = modeSelect.options[modeSelect.selectedIndex].text;

    const mapObj = mappings.find(m => m.levelName === selectedMapName);
    if (!mapObj) return;

    const modeObj = mapObj.modes.find(m => m.name === selectedModeName);
    if (!modeObj) return;

    const splitSelectionDiv = document.getElementById('map-n-mode-split-selection');
    if (!splitSelectionDiv) return;

    const skippedSplitIndices: number[] = [];
    const checkpointDivs = splitSelectionDiv.querySelectorAll('div.toggle-switch');
    checkpointDivs.forEach((div, idx) => {
        const checkbox = div.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        if (!checkbox?.checked) {
            skippedSplitIndices.push(idx);
        }
    });

    const skippedSplits = [{
        mode: modeObj.key,
        skippedSplitIndices
    }];

    await window.electronAPI.onSkipSplitsChanged(skippedSplits);
};
