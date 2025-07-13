import {reloadGoldSplitsIfModeActive} from "./splits-tab-handler";
import {formatPbTime, parsePbTime} from "../util/time-formating";
import {getFrontendMappings, getFrontendPbs} from "./backend-state-handler";


export function addEmptyPbInputFields() {
    const pbContentDiv = document.getElementById('pbs-content');
    if (!pbContentDiv) return;
    const mappings = getFrontendMappings();
    pbContentDiv.innerHTML = ''; // Clear existing content
    mappings.forEach(map => {
        const mapHeader = document.createElement('h3');
        mapHeader.textContent = map.levelName;
        pbContentDiv.appendChild(mapHeader);

        map.modes.forEach(mode => {
            const label = document.createElement('label');
            label.setAttribute('for', `pb-mode-${mode.key}`);
            label.textContent = `${mode.name}:`;

            const input = document.createElement('input');
            input.type = 'text';
            input.id = `pb-mode-${mode.key}`;
            input.className = 'input-field';
            input.placeholder = '00:00.000';
            input.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    const valid = await onPbEntered(input, mode.key)
                    if (valid) input.blur();
                }
            });

            const button = document.createElement('button');
            button.innerHTML = `<img src="./assets/diskette.png" alt="Save Icon" id="save-pb-mode-${mode.key}">`;
            button.addEventListener('click', async () => {
                await onPbEntered(input, mode.key);
            });


            pbContentDiv.appendChild(label);
            pbContentDiv.appendChild(input);
            pbContentDiv.appendChild(button);
        });
    });

}

window.electronAPI.onPbImproved((event, data) => {
    const {mode, pbTime} = data;
    __electronLog.info(`Frontend: PB improved for mode ${mode}: ${pbTime}`);
    const input = document.getElementById(`pb-mode-${mode}`) as HTMLInputElement;
    input.value = formatPbTime(pbTime);

})

async function onPbEntered(input: HTMLInputElement, modeKey: number): Promise<boolean> {
    const time = parsePbTime((input as HTMLInputElement).value);
    if (time < 0) {
        input.classList.add('invalid');
        return false;
    } else if (time === 0) {
        return false;
    } else {
        input.classList.remove('invalid');
    }
    __electronLog.info(`PB entered for mode ${modeKey}: ${time}`);
    await window.electronAPI.onPbEntered({mode: modeKey, time: time});
    await reloadGoldSplitsIfModeActive(modeKey)
    return true;
}

export function setPbValuesToInputs(): void {
    document.querySelectorAll('input[type="text"][id^="pb-mode-"]').forEach(input => {
        const modeIndex = parseInt(input.id.replace('pb-mode-', ''), 10);
        const pbs = getFrontendPbs()
        const pb = pbs.find(p => p.mode === modeIndex);
        if (pb && pb.time && pb.time < Infinity && pb.time !== 0) {
            (input as HTMLInputElement).value = formatPbTime(pb.time);
        }
    });
}