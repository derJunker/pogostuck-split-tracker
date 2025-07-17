export async function showWin11MessagesIfOnWin11() {
    const isWin11 = await window.electronAPI.isWindows11();
    __electronLog.info("Is Windows 11: ", isWin11);
    if (isWin11) {
        const win11Content = document.querySelectorAll('.only-win11')
        win11Content.forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.removeProperty('display');
        });
    }
}

document.querySelectorAll(".open-settings-link").forEach(link => link.addEventListener("click", async () => {
    await window.electronAPI.openWindowsSettings();
}));

export async function showFullscreenMessageIfPlayingWithFullscreen() {
    const isFullscreen = await window.electronAPI.hasPogostuckFullscreen();
    __electronLog.info("Has Pogostuck fullscreen: ", isFullscreen);
    if (isFullscreen) {
        const fsContent = document.querySelectorAll('.only-fs')
        fsContent.forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.removeProperty('display');
        });
    }
}