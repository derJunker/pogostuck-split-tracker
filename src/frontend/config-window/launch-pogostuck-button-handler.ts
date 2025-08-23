export function initLaunchPogostuckButtonListeners() {
    const launchPogoBtn = document.getElementById('launch-pogo-btn');
    if (!launchPogoBtn) {
        __electronLog.error("[Frontend|Config] Launch Pogostuck button not found in config window");
        return;
    }
    launchPogoBtn.addEventListener("click", async () => {
        await window.electronAPI.openPogostuck();
    })
    window.electronAPI.onStatusChanged((event: Electron.IpcRendererEvent, status: { pogoPathValid: boolean; steamPathValid: boolean; friendCodeValid: boolean;showLogDetectMessage: boolean; logsDetected: boolean }) => {
        __electronLog.info(`[Frontend|Config] Status changed: pogoPathValid: ${status.pogoPathValid}, steamPathValid: ${status.steamPathValid}, friendCodeValid: ${status.friendCodeValid}`);
        const launchPogoBtn = document.getElementById('launch-pogo-btn');
        if (launchPogoBtn) {
            if (status.steamPathValid)
                launchPogoBtn.removeAttribute('disabled');
            else
                launchPogoBtn.setAttribute('disabled', 'true');
        }
    });

}