import {switchLangueTexts} from "./language-handler";
import {getFrontendSettings} from "./backend-state-handler";
import {showDownloadingScreen} from "./loading-screen-handler";
import DOMPurify from 'dompurify';

window.electronAPI.onNewReleaseAvailable(async (_, releaseInfo: { tag_name: string, body: string, browser_download_url: string }) => {
    const modal = document.getElementById('new-release-modal') as HTMLElement;
    const content = document.getElementById('release-info-content') as HTMLElement;
    __electronLog.info(`release version: ${releaseInfo.tag_name}, `);
    if (modal && content) {
        content.innerHTML = `
            <p>Version: <strong>${releaseInfo.tag_name}</strong></p>
            <p>${sanitizeHtml(releaseInfo.body)}</p>
        `
        const lang = getFrontendSettings().lang;
        switchLangueTexts(lang);

        modal.style.display = 'block';
        const downloadLink = document.getElementById('release-download-link') as HTMLAnchorElement;
        downloadLink.href = releaseInfo.browser_download_url;

        const updateBtn = document.getElementById('release-download-btn')
        const manualDownloadBtn = document.getElementById('release-manual-download-btn')

        // Only show automatic download on Windows; other platforms must download manually
        const platform = await window.electronAPI.getPlatform();
        const isWindows = platform === 'win32';
        const isLinux = platform === 'linux';
        const hasDownloadUrl = releaseInfo.browser_download_url.length > 0;

        if (isWindows && hasDownloadUrl) {
            updateBtn?.style.removeProperty('display');
            if (manualDownloadBtn) manualDownloadBtn.style.display = 'none';
            updateBtn?.addEventListener('click', async () => {
                showDownloadingScreen();
                await window.electronAPI.onUpdateBtnClicked(releaseInfo.browser_download_url);
            })
        } else {
            if (updateBtn) updateBtn.style.display = 'none';
            manualDownloadBtn?.style.removeProperty('display');
            const manualLink = manualDownloadBtn?.querySelector('a') as HTMLAnchorElement;
            if (manualLink && isLinux) {
                manualLink.removeAttribute('href');
                manualLink.addEventListener('click', async (event) => {
                    event.preventDefault();
                    await window.electronAPI.openLinkInBrowser(`https://github.com/derJunker/pogostuck-split-tracker/releases/tag/${releaseInfo.tag_name}`);
                });
            } else if (manualLink) {
                manualLink.href = `https://github.com/derJunker/pogostuck-split-tracker/releases/tag/${releaseInfo.tag_name}`;
            }
        }

        const buyMeACoffeeButton = document.getElementById('buy-coffee') as HTMLButtonElement;
        buyMeACoffeeButton.style.display = 'none';
        const updateButton = document.getElementById('update-btn')! as HTMLElement
        updateButton.style.display = 'block';
        updateButton.addEventListener('click', () => {
            modal.style.display = 'block'
        });
    }
});

function sanitizeHtml(html: string) {
    return DOMPurify.sanitize(html)
}

window.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('new-release-modal');
    const closeBtn = document.getElementById('close-release-modal');
    const okBtn = document.getElementById('release-modal-ok');
    if (modal && closeBtn && okBtn) {
        __electronLog.info("Adding event listeners for release modal close and ok buttons");
        closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
        okBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    }
});