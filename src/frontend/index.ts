// tab changing :)
const menuButtons = document.querySelectorAll('.menu-btn');
const contentDivs = document.querySelectorAll('.menu-content');

let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let showTimeout: ReturnType<typeof setTimeout> | null = null;

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

window.addEventListener('DOMContentLoaded', () => {
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
        }
    });
});
