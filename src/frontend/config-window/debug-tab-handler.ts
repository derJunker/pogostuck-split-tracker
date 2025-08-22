export function initDebugButtonListeners() {
    const copyLogsButton = document.getElementById('copy-logs-btn') as HTMLButtonElement;
    const openAppDataDirButton = document.getElementById('open-appdata-dir-btn') as HTMLButtonElement;

    copyLogsButton?.addEventListener('click', async () => {
        __electronLog.debug('copyLogsButton', copyLogsButton);
    });

    openAppDataDirButton?.addEventListener('click', async () => {
        __electronLog.debug('openAppDataDirButton', openAppDataDirButton);
    });
}