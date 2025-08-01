window.electronAPI.onNewReleaseAvailable((_, releaseInfo: { tag_name: string, body: string, browser_download_url: string }) => {
    const modal = document.getElementById('new-release-modal') as HTMLElement;
    const content = document.getElementById('release-info-content') as HTMLElement;
    __electronLog.info(`release version: ${releaseInfo.tag_name}, `);
    if (modal && content) {
        content.innerHTML = `
            <p>Version: <strong>${releaseInfo.tag_name}</strong></p>
            <p>${releaseInfo.body}</p>
        `
        modal.style.display = 'block';
        const downloadLink = document.getElementById('release-download-link') as HTMLAnchorElement;
        downloadLink.href = releaseInfo.browser_download_url;

        const updateButton = document.getElementById('update-btn')! as HTMLElement
        updateButton.style.display = 'block';
        updateButton.addEventListener('click', () => {
            modal.style.display = 'block'
        });
    }
});

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