const menuButtons: NodeListOf<HTMLElement> = document.querySelectorAll('.menu-btn');
const contentDivs = document.querySelectorAll('.menu-content');

let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let showTimeout: ReturnType<typeof setTimeout> | null = null;

export function initMenuNavListeners() {
    menuButtons.forEach(btn => {
        const div = document.getElementById(btn.id.replace('-btn', '-content')) as HTMLElement | null;
        if (div && !btn.classList.contains('active')) {
            div.classList.add('hide');
            div.style.display = 'none';
        }
    });

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
                contentDivs.forEach(async div => {
                    const htmlDiv = div as HTMLElement;
                    if (div.id === btn.id.replace('-btn', '-content')) {
                        htmlDiv.style.display = '';
                        void htmlDiv.offsetWidth;
                        htmlDiv.classList.remove('hide');
                        void window.electronAPI.tabChanged(btn.id.replace('-btn', ''))
                    }
                });
            }, 300);
        });
    });

    addTabLinkListeners()

    window.electronAPI.getSelectedTab().then(tab => {
        if (tab.length === 0) return;
        const button = (document.querySelector(`#${tab}-btn`) as HTMLButtonElement | null);
        button?.click()
    });
}

function addTabLinkListeners() {
    document.querySelectorAll('a[data-tab-link]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = (link as HTMLAnchorElement).getAttribute('data-tab-link')!;
            menuButtons.forEach((btn) => {
                if (btn.id === targetId + '-btn') {
                    btn.click();
                }
            });
        });
    })
}


